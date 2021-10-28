import {Controller, Post, UseGuards} from "@nestjs/common";
import {InternalAuthGuard} from "../commons/guards/internal-auth.guard";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../inc/constants";
import {GcpDatastoreService} from "../../inc/services/core/gcp-datastore/gcp-datastore.service";
import {DatastoreKinds} from "../../inc/services/core/gcp-datastore/model";

@Controller('worker-pool')
@UseGuards(InternalAuthGuard)
export class WorkerPoolController {

    constructor(private readonly contractWorkerService: ContractWorkerService,
                private readonly gcpDatastoreService: GcpDatastoreService) {
    }

    @Post('execute-community-contract')
    processQueue(): void {
        this.contractWorkerService.hardSendContract(Constants.COMMUNITY_CONTRACT);
    }

    @Post('execute-all-contracts')
    async processContracts() {
        const contracts = (await this.gcpDatastoreService.getAll(DatastoreKinds.COMMUNITY_TOKENS)).flat()
            .filter(item => item.contractId);
        return contracts.map(contractObject => ({
            contractId: contractObject.contractId,
            ...this.contractWorkerService.sendContractToWorkerPool(contractObject.contractId)
        }));
    }

}
