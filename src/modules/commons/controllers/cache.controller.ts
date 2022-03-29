import {Controller, Get} from "@nestjs/common";
import {ContractWorkerService} from "../../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../../inc/constants";

@Controller()
export class CacheController {

    constructor(private readonly contractWorkerService: ContractWorkerService) {
    }

    @Get('ping')
    public getStatus() {
        return {
            status: 'Online',
            revision: process.env["REV"],
            port: process.env["PORT"],
            workerPool: {
                ...this.contractWorkerService.getStats()
            },
            communityContract: Constants.COMMUNITY_CONTRACT,
            communityContractEnv: process.env.COMMUNITY_CONTRACT
        }
    }

}
