import {Injectable} from "@nestjs/common";
import {DatastoreKinds, QueryableBase, QueryResult, GcpDatastoreService} from "verto-internals/services/gcp";
import {DsFailedContracts} from "../core/gcp-datastore/kind-interfaces/ds-failed-contracts";

/**
 * This service is responsible for the interaction with entity {@Link DatastoreKinds.CONTRACTS_VS_ADDRESS}
 */
@Injectable()
export class FailedContractsDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    async getFailedContract(contractId: string): Promise<DsFailedContracts | undefined> {
        return await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.FAILED_CONTRACTS, contractId)
        );
    }

    /**
     * Query entity CONTRACTS_VS_ADDRESS based on {@link QueryableBase}
     * @param data
     */
    async queryContractsAddress(data: QueryableBase = {}): Promise<QueryResult<DsFailedContracts>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.FAILED_CONTRACTS,
            ...data
        });
    }

}
