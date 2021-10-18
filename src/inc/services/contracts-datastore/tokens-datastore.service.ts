import {Injectable} from "@nestjs/common";
import {CommunityTokensDatastore} from "../core/gcp-datastore/kind-interfaces/ds-community-tokens";
import {DatastoreKinds, QueryableBase, QueryResult} from "../core/gcp-datastore/model";
import {GcpDatastoreService} from "../core/gcp-datastore/gcp-datastore.service";

@Injectable()
export class TokensDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    async getToken(contractId: string): Promise<CommunityTokensDatastore | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.COMMUNITY_TOKENS, contractId)
        );
    }

    async queryTokens(data: QueryableBase = {}): Promise<QueryResult<CommunityTokensDatastore>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.COMMUNITY_TOKENS,
            ...data
        });
    }

}
