import {Injectable} from "@nestjs/common";
import {GcpDatastoreService} from "../core/gcp-datastore/gcp-datastore.service";
import {DatastoreKinds, QueryableBase, QueryResult} from "../core/gcp-datastore/model";
import {CommunityPeopleDatastore} from "../core/gcp-datastore/kind-interfaces/ds-community-people";

@Injectable()
export class UsersDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    /**
     * Get the metadata of a token based on a token (contract) id.
     * @param contractId token id.
     */
    async getUser(username: string): Promise<CommunityPeopleDatastore | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.COMMUNITY_PEOPLE, username)
        );
    }

    /**
     * Query entity COMMUNITY_TOKENS based on {@link QueryableBase}
     * @param data
     */
    async queryUsers(data: QueryableBase = {}): Promise<QueryResult<CommunityPeopleDatastore>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.COMMUNITY_PEOPLE,
            ...data
        });
    }

}
