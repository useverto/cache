import {Controller, Param, Post} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";

@Controller('contracts')
export class ContractController {

    constructor(private readonly contractService: ContractService) {
    }

    @Post('execute/:id')
    async processContract(@Param('id') id: string) {
        return this.executeContract(id);
    }

    @Post('save/:id')
    async saveContract(@Param('id') id: string) {

    }

    private async executeContract(id: string) {
        return this.contractService.processState(id);
    }

}
