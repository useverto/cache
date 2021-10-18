import {Module} from "@nestjs/common";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {SiteController} from "./site.controller";

@Module({
    providers: [
        TokensDatastoreService
    ],
    controllers: [
        SiteController
    ]
})
export class SitesModule {

}
