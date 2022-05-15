import {Injectable} from "@nestjs/common";
import {DatastoreKinds, QueryableBase, QueryResult, GcpDatastoreService} from "verto-internals/services/gcp";
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

    async getContractsInUser(addressId: string) {
        const queryContractsInUser = await this.queryContractsAddress(
            {
                filters: [{
                    property: 'address',
                    operator: '=',
                    value: addressId
                }]
            }
        );

        if(queryContractsInUser.isEmpty()) {
            return [];
        } else {
            const contracts = queryContractsInUser.entities;
            return contracts.map((item) => item.contract);
        }
    }

}
