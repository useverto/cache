import {Controller, Get} from "@nestjs/common";
import {ContractWorkerService} from "../../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../../inc/constants";
import {GcpContractStorageService} from "../../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";

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
            communityContractEnv: process.env.COMMUNITY_CONTRACT,
            bucket: GcpContractStorageService.S_PARENT_BUCKET_NAME,
            addressBucket: GcpContractStorageService.S_PARENT_ADDRESS_BUCKET_NAME
        }
    }

}
