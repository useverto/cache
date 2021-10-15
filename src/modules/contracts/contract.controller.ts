import {Controller, Param, Post, Query, UseGuards} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {OnlyDevGuard} from "../commons/guards/only-dev.guard";

@Controller('contracts')
export class ContractController {

    constructor(private readonly contractService: ContractService,
                private readonly contractWorkerService: ContractWorkerService) {
    }

    @Post('save/:id')
    async saveContract(@Param('id') id: string) {
        return this.contractWorkerService.sendContractToWorkerPool(id);
    }

    @Post('execute/:id')
    @UseGuards(OnlyDevGuard)
    async processContract(@Param('id') id: string) {
        return this.executeContract(id);
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
