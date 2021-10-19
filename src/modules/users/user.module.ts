import {Module} from "@nestjs/common";
import {ContractsAddressDatastoreService} from "../../inc/services/contracts-datastore/contracts-address-datastore.service";
import {UsersController} from "./users.controller";
import {CommonModule} from "../commons/common.module";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        ContractsAddressDatastoreService
    ],
    controllers: [
        UsersController
    ]
})
export class UserModule {

}
