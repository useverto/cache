import {Injectable} from "@nestjs/common";
import {GcpDatastoreService, DatastoreKinds} from "verto-internals/services/gcp";
import {DsContractRecoverable} from "../core/gcp-datastore/kind-interfaces/ds-contract-recoverable";
import {SaveResponse} from "@google-cloud/datastore/build/src/request";

@Injectable()
export class RecoverableContractsDatastoreService {

    constructor(private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    saveContract(contractId: string): Promise<SaveResponse> {
        return this.gcpDatastoreService.saveFull<DsContractRecoverable>({
            kind: DatastoreKinds.RECOVERABLE_CONTRACTS,
            id: contractId,
            data: {
                contractId
            }
        });
    }

    async getAllAndClean(type: 'recoverable' | 'failed' = 'recoverable'): Promise<Array<DsContractRecoverable>> {
        const contracts = (await this.gcpDatastoreService.getAll(type === 'recoverable'
            ? DatastoreKinds.RECOVERABLE_CONTRACTS
            : DatastoreKinds.FAILED_CONTRACTS))
            .flat()
            .filter(item => item.contractId);

        await this.gcpDatastoreService.delete([...contracts].map(item => this.gcpDatastoreService.createKey(
            DatastoreKinds.RECOVERABLE_CONTRACTS,
            item.contractId
        )));

        return contracts;
    }

}
