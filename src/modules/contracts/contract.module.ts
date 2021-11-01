import {Module} from "@nestjs/common";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {ContractController} from "./contract.controller";
import {CommonModule} from "../commons/common.module";
import {FailedContractsDatastoreService} from "../../inc/services/contracts-datastore/failed-contracts-datastore.service";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        ContractService,
        FailedContractsDatastoreService
    ],
    controllers: [
        ContractController
    ]
})
export class ContractModule {}
