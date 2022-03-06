import {Controller, Get, Param, Post, Query, UseGuards} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {OnlyDevGuard} from "../commons/guards/only-dev.guard";
import {WorkerProcessPostResult} from "../../inc/worker-pool/model";
import {ContractResult} from "../../inc/common.model";
import {FailedContractsDatastoreService} from "../../inc/services/contracts-datastore/failed-contracts-datastore.service";
import {InternalAuthGuard} from "../commons/guards/internal-auth.guard";

@Controller('contracts')
export class ContractController {

    constructor(private readonly contractService: ContractService,
                private readonly contractWorkerService: ContractWorkerService,
                private readonly failedContractDatastoreService: FailedContractsDatastoreService) {
    }

    @Get('status/:id')
    async isFailed(@Param('id') id: string) {
        const failedContract = await this.failedContractDatastoreService.getFailedContract(id);

        return {
            contractId: id,
            status: failedContract ? 'FAILED' : 'OK'
        }
    }

    @Post('save/:id')
    saveContract(@Param('id') id: string): WorkerProcessPostResult {
        return this.contractWorkerService.sendContractToWorkerPool(id);
    }

    @Post('execute/:id')
    @UseGuards(OnlyDevGuard)
    async processContract(@Param('id') id: string): Promise<ContractResult> {
        return this.executeContract(id);
    }

    @Post('save-skeletons')
    @UseGuards(InternalAuthGuard)
    async processSkeletons() {
        return this.contractWorkerService.cacheFullContractSkeleton();
    }

    @Post('saveAndWait/:id')
    @UseGuards(OnlyDevGuard)
    async saveContractAndWait(@Param('id') id: string, @Query('showResult') showResult: string) {
        const data = this.contractWorkerService.sendContractToWorkerPool(id,
            true,
            (showResult || 'false').toLowerCase() === 'true');
        const promise = await data.data?.promiseContext?.promise;
        return {
            ...data,
            data: {
                ...data.data,
                promiseContext: {
                    ...data?.data.promiseContext,
                    promise
                }
            }
        }
    }

    private async executeContract(id: string) {
        return this.contractService.processState(id);
    }

}
