import {Injectable} from "@nestjs/common";
import {CommunityTokensDatastore} from "../core/gcp-datastore/kind-interfaces/ds-community-tokens";
import {DatastoreKinds, QueryableBase, QueryResult} from "../core/gcp-datastore/model";
import {GcpDatastoreService} from "../core/gcp-datastore/gcp-datastore.service";
import {BalancesDatastore} from "../core/gcp-datastore/kind-interfaces/ds-balances";

/**
 * This service is responsible for the interaction with entity {@Link DatastoreKinds.COMMUNITY_TOKENS}
 */
@Injectable()
export class TokensDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    /**
     * Get the metadata of a token based on a token (contract) id.
     * @param contractId token id.
     */
    async getToken(contractId: string): Promise<CommunityTokensDatastore | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.COMMUNITY_TOKENS, contractId)
        );
    }

    /**
     * Query entity COMMUNITY_TOKENS based on {@link QueryableBase}
     * @param data
     */
    async queryTokens(data: QueryableBase = {}): Promise<QueryResult<CommunityTokensDatastore>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.COMMUNITY_TOKENS,
            ...data
        });
    }

    /**
     * Query entity BALANCES based on {@link QueryableBase}
     * @param data
     */
    async queryBalances(data: QueryableBase = {}): Promise<QueryResult<BalancesDatastore>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.BALANCES,
            ...data
        });
    }

}
