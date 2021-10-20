import {Injectable} from "@nestjs/common";
import {DatastoreKinds, QueryableBase, QueryResult} from "../core/gcp-datastore/model";
import {GcpDatastoreService} from "../core/gcp-datastore/gcp-datastore.service";
import {ContractsAddressDatastore} from "../core/gcp-datastore/kind-interfaces/ds-contracts-vs-address";

/**
 * This service is responsible for the interaction with entity {@Link DatastoreKinds.CONTRACTS_VS_ADDRESS}
 */
@Injectable()
export class ContractsAddressDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    /**
     * Query entity CONTRACTS_VS_ADDRESS based on {@link QueryableBase}
     * @param data
     */
    async queryContractsAddress(data: QueryableBase = {}): Promise<QueryResult<ContractsAddressDatastore>> {
        return await this.gcpDatastoreService.invokeQuery({
            kind: DatastoreKinds.CONTRACTS_VS_ADDRESS,
            ...data
        });
    }

}
