import {Controller, Get} from "@nestjs/common";
import {ContractWorkerService} from "../../../inc/services/core/contract-worker/contract-worker.service";

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
            }
        }
    }

}
