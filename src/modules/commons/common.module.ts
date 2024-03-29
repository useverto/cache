import {Module} from "@nestjs/common";
import {ArweaveClientService} from "../../inc/services/core/arweave/arweave-client.service";
import {GcpStorageService} from "verto-internals/services/gcp/gcp-storage.service";
import {GcpContractStorageService} from "../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {GcpDatastoreService} from "verto-internals/services/gcp";
import {ExceptionHandlerService} from "../../inc/services/core/handlers/exception-handler";
import {RecoverableContractsDatastoreService} from "../../inc/services/contracts-datastore/recoverable-contracts-datastore.service";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";

const members = [ArweaveClientService, GcpStorageService, GcpContractStorageService, ContractWorkerService, GcpDatastoreService, ExceptionHandlerService, RecoverableContractsDatastoreService, TokensDatastoreService]

@Module({
    providers: [...members],
    exports: [...members]
})
export class CommonModule {
}
