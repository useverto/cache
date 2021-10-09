import {Controller, Param, Post} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";

@Controller('contracts')
export class ContractController {

    constructor(private readonly contractService: ContractService) {
    }

    @Post('process/:id')
    async processContract(@Param('id') id: string) {
        return this.contractService.processState(id);
    }

}
