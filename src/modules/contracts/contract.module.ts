import {Module} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {ContractController} from "./contract.controller";
import {CommonModule} from "../commons/common.module";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        ContractService
    ],
    controllers: [
        ContractController
    ]
})
export class ContractModule {}
