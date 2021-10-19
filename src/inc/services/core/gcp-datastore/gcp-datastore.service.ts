import {Injectable} from "@nestjs/common";
import {Datastore, Query} from "@google-cloud/datastore";
import {GcpCredentials} from "../../../gcp-credentials/gcp-credentials";
import {DatastoreEntities, DatastoreEntity, DatastoreKinds, EntityBuilder, Queryable, QueryResult} from "./model";
import {entity} from "@google-cloud/datastore/build/src/entity";
import {RunQueryOptions, RunQueryResponse} from "@google-cloud/datastore/build/src/query";
import {google} from "@google-cloud/datastore/build/protos/protos";
import {GetResponse, SaveResponse} from "@google-cloud/datastore/build/src/request";

@Injectable()
export class GcpDatastoreService {

    private readonly datastoreInstance: Datastore;

    constructor() {
        const credentials = GcpCredentials.getCredentials();
        this.datastoreInstance = new Datastore({
            projectId: credentials.project_id,
            credentials
        });
    }

    createKey(kind: DatastoreKinds, id: any): entity.Key {
        return this.datastoreInstance.key([kind, id]);
    }

    buildEntity<T = any>(key: entity.Key, data: T): DatastoreEntity<T> {
        return {
            key,
            data
        }
    }

    saveFull<T = any>(entity: EntityBuilder<Partial<T>>): Promise<SaveResponse> {
        const key = this.createKey(entity.kind, entity.id);
        const savedEntity = this.buildEntity(key, entity.data);
        return this.save(savedEntity);
    }

    save<T = any>(entity: Array<DatastoreEntity<T>> | DatastoreEntity<T>): Promise<SaveResponse> {
        return this.datastoreInstance.save(entity);
    }

    get(key: DatastoreEntities): Promise<GetResponse> {
        return this.datastoreInstance.get(key);
    }

    async getSingle<T = any>(key: entity.Key): Promise<T | undefined> {
        const data = await this.get(key);
        return data?.length > 0 ? data[0] : undefined;
    }

    query(kind: DatastoreKinds, processor: (query: Query) => Query, options?: RunQueryOptions): Promise<RunQueryResponse> {
        let query = this.datastoreInstance.createQuery(kind);
        if(processor) {
            query = processor(query);
        }

        return this.datastoreInstance.runQuery(query, options);
    }

    async invokeQuery<T = any>(query: Queryable): Promise<QueryResult<T>> {
        let gdQuery = this.datastoreInstance.createQuery(query.kind);
        const { limit, offset, filters } = query;

        if(limit) {
            gdQuery = gdQuery.limit(limit);
        }

        if(offset) {
            gdQuery = gdQuery.offset(offset);
        }

        if(filters && filters.length > 0) {
            filters.forEach((filter) => {
                gdQuery = gdQuery.filter(filter.property, filter.operator, filter.value);
            });
        }

        const data = await this.datastoreInstance.runQuery(gdQuery) || [];
        return {
            entities: data[0] || [],
            resultsStatus: (data[1] || {}).moreResults || 'NO_RESULTS',
            isEmpty: function() {
                return this.resultsStatus === 'NO_RESULTS'
            }
        }
    }

}
