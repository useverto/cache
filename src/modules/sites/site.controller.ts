import {Controller, Get, Param, Query} from "@nestjs/common";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {ArtFilter, CollectionsFilter} from "../../inc/services/contracts-datastore/common-filters/token-filters";

@Controller('token')
export class SiteController {

    constructor(private readonly tokensDatastoreService: TokensDatastoreService) {
    }

    @Get('metadata/:id')
    public async getTokenType(@Param('id') id: string) {
        return await this.tokensDatastoreService.getToken(id);
    }

    @Get('artwork/random')
    public async getRandomArtwork(@Query('limit') limit: string) {
        let intLimit = parseInt(limit || '4');
        intLimit = intLimit > 10 ? 10 : intLimit;

        return await this.tokensDatastoreService.queryTokens({
            limit: intLimit,
            filters: [
                ArtFilter,
                CollectionsFilter
            ]
        });
    }

}
