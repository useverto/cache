import {Module} from "@nestjs/common";
import {ArweaveClientService} from "../../inc/services/core/arweave/arweave-client.service";
import {GcpStorageService} from "../../inc/services/core/gcp-storage/gcp-storage.service";
import {GcpContractStorageService} from "../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {GcpDatastoreService} from "../../inc/services/core/gcp-datastore/gcp-datastore.service";

const members = [ArweaveClientService, GcpStorageService, GcpContractStorageService, ContractWorkerService, GcpDatastoreService]

@Module({
    providers: [...members],
    exports: [...members]
})
export class CommonModule {
}
