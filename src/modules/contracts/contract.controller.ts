import {Controller, Param, Post, Query} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";

@Controller('contracts')
export class ContractController {

    constructor(private readonly contractService: ContractService,
                private readonly contractWorkerService: ContractWorkerService) {
    }

    @Post('execute/:id')
    async processContract(@Param('id') id: string) {
        return this.executeContract(id);
    }

    @Post('save/:id')
    async saveContract(@Param('id') id: string) {
        return this.contractWorkerService.sendContractToWorkerPool(id);
    }

    @Post('saveAndWait/:id')
    async saveContractAndWait(@Param('id') id: string, @Query('showResult') showResult: string) {
        return this.contractWorkerService.sendContractToWorkerPool(id,
            true,
            (showResult || 'false').toLowerCase() === 'true');
    }

    private async executeContract(id: string) {
        return this.contractService.processState(id);
    }

}
