import {Controller, Get, Post, UseGuards} from "@nestjs/common";
import {InternalAuthGuard} from "../commons/guards/internal-auth.guard";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../inc/constants";
import {GcpDatastoreService} from "../../inc/services/core/gcp-datastore/gcp-datastore.service";
import {DatastoreKinds} from "../../inc/services/core/gcp-datastore/model";
import {GcpContractStorageService} from "../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";
import {RecoverableContractsDatastoreService} from "../../inc/services/contracts-datastore/recoverable-contracts-datastore.service";

@Controller('worker-pool')
@UseGuards(InternalAuthGuard)
export class WorkerPoolController {

    constructor(private readonly contractWorkerService: ContractWorkerService,
                private readonly gcpDatastoreService: GcpDatastoreService,
                private readonly gcpContractStorageService: GcpContractStorageService,
                private readonly recoverableContractDatastoreService: RecoverableContractsDatastoreService) {
    }

    @Post('execute-community-contract')
    processQueue(): void {
        this.contractWorkerService.hardSendContract(Constants.COMMUNITY_CONTRACT);
    }

    @Post('execute-all-contracts')
    async processContracts() {
        const contracts = await this.getAllContracts();
        return contracts.map(contractObject => ({
            contractId: contractObject.contractId,
            ...this.contractWorkerService.sendContractToWorkerPool(contractObject.contractId)
        }));
    }

    @Post('execute-missing-contracts')
    async findMissingContracts() {
        const contracts = await this.getAllContracts();
        const inStorage = await this.gcpContractStorageService.findAllContractsInStorage();
        // @ts-ignore
        const flatten = Object.assign(...inStorage);
        const missingContracts = contracts.filter(item => flatten[item.contractId] === undefined);
        missingContracts.forEach((item) => {
            this.contractWorkerService.sendContractToWorkerPool(item.contractId);
        });
        return missingContracts;
    }

    @Post('execute-failed-contracts')
    async executeFailedContracts() {
        const contracts = await this.recoverableContractDatastoreService.getAllAndClean('failed');
        contracts.forEach((item) => {
            this.contractWorkerService.sendContractToWorkerPool(item.contractId);
        });
    }

    private async getAllContracts() {
        return (await this.gcpDatastoreService.getAll(DatastoreKinds.COMMUNITY_TOKENS))
            .flat()
            .filter(item => item.contractId);

    }

}
