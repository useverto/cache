import {Module} from "@nestjs/common";
import {CommonModule} from "../commons/common.module";
import {ContractService} from "../../inc/services/contracts/contract.service";
import {WorkerPoolController} from "./worker-pool.controller";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        ContractService
    ],
    controllers: [
        WorkerPoolController
    ]
})
export class WorkerPoolModule {

}
