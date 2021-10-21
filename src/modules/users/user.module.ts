import {Module} from "@nestjs/common";
import {ContractsAddressDatastoreService} from "../../inc/services/contracts-datastore/contracts-address-datastore.service";
import {UsersController} from "./users.controller";
import {CommonModule} from "../commons/common.module";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {UsersDatastoreService} from "../../inc/services/contracts-datastore/users-datastore.service";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        ContractsAddressDatastoreService,
        TokensDatastoreService,
        UsersDatastoreService
    ],
    controllers: [
        UsersController
    ]
})
export class UserModule {

}
