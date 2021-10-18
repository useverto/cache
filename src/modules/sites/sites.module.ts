import {Module} from "@nestjs/common";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {SiteController} from "./site.controller";
import {CommonModule} from "../commons/common.module";

@Module({
    imports: [
        CommonModule
    ],
    providers: [
        TokensDatastoreService
    ],
    controllers: [
        SiteController
    ]
})
export class SitesModule {

}
