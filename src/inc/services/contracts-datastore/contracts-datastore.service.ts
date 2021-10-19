import {Injectable} from "@nestjs/common";
import {GcpDatastoreService} from "../core/gcp-datastore/gcp-datastore.service";
import {ContractsDatastore} from "../core/gcp-datastore/kind-interfaces/ds-contracts";
import {DatastoreKinds} from "../core/gcp-datastore/model";
import {CommunityPeopleDatastore} from "../core/gcp-datastore/kind-interfaces/ds-community-people";
import {Query} from "@google-cloud/datastore";
import {google} from "@google-cloud/datastore/build/protos/protos";
import {RunQueryResponse} from "@google-cloud/datastore/build/src/query";

@Injectable()
export class ContractsDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    async getContractMetadata(contractId: string): Promise<ContractsDatastore | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.CONTRACTS, contractId)
        );
    }

    async getPeople(username: string): Promise<CommunityPeopleDatastore | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.COMMUNITY_PEOPLE, username)
        );
    }

    async queryTokens(query: (query: Query) => Query): Promise<RunQueryResponse> {
        return this.gcpDatastoreService.query(DatastoreKinds.COMMUNITY_TOKENS, query);
    }

}
