import {Controller, Post, UseGuards} from "@nestjs/common";
import {InternalAuthGuard} from "../commons/guards/internal-auth.guard";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../inc/constants";

@Controller('worker-pool')
@UseGuards(InternalAuthGuard)
export class WorkerPoolController {

    constructor(private readonly contractWorkerService: ContractWorkerService) {
    }

    @Post('execute-community-contract')
    processQueue(): void {
        this.contractWorkerService.hardSendContract(Constants.COMMUNITY_CONTRACT);
    }

}
