import {Controller, Get, Param, Query} from "@nestjs/common";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {
    ArtFilter,
    CollectionsFilter,
    CommunitiesFilter
} from "../../inc/services/contracts-datastore/common-filters/token-filters";
import {QueryResult, QueryResultBase} from "../../inc/services/core/gcp-datastore/model";
import {CommunityTokensDatastore} from "../../inc/services/core/gcp-datastore/kind-interfaces/ds-community-tokens";
import {BalancesDatastore} from "../../inc/services/core/gcp-datastore/kind-interfaces/ds-balances";

@Controller('token')
export class SiteController {

    constructor(private readonly tokensDatastoreService: TokensDatastoreService) {
    }

    @Get('metadata/:id')
    public async getTokenType(@Param('id') id: string): Promise<Partial<CommunityTokensDatastore>> {
        return (await this.tokensDatastoreService.getToken(id) || {});
    }

    @Get('artwork/random')
    public async getRandomArtwork(@Query('limit') limit: string): Promise<QueryResultBase<CommunityTokensDatastore>> {
        let intLimit = parseInt(limit || '4');
        intLimit = intLimit > 10 ? 10 : intLimit;

        const art = await this.tokensDatastoreService.queryTokens({
            limit: intLimit,
            filters: [
                ArtFilter
            ]
        });

        const collection = await this.tokensDatastoreService.queryTokens({
            limit: intLimit,
            filters: [
                CollectionsFilter
            ]
        });

        const finalEntities = [
            ...art.entities,
            ...collection.entities
        ].sort(() => Math.random() - Math.random()).slice(0, intLimit);

        return {
            entities: finalEntities,
            resultsStatus: finalEntities.length > 0 ? 'FOUND' : 'EMPTY'
        }
    }

    @Get('communities/random')
    public async getRandomCommunities(@Query('limit') limit: string): Promise<QueryResultBase<CommunityTokensDatastore>> {
        let intLimit = parseInt(limit || '4');
        intLimit = intLimit > 10 ? 10 : intLimit;

        const communities = await this.tokensDatastoreService.queryTokens({
            limit: intLimit,
            filters: [
                CommunitiesFilter
            ]
        });

        const finalEntities = [
            ...communities.entities
        ].sort(() => Math.random() - Math.random()).slice(0, intLimit);

        return {
            entities: finalEntities,
            resultsStatus: finalEntities.length > 0 ? 'FOUND' : 'EMPTY'
        }
    }

    @Get('communities/top')
    public async getTopCommunities(@Query('limit') limit: string): Promise<QueryResultBase<BalancesDatastore>> {
        let intLimit = parseInt(limit || '4');
        intLimit = intLimit > 10 ? 10 : intLimit;

        const communities = await this.tokensDatastoreService.queryBalances({
            limit: intLimit,
            order: ['balanceLength', {
                descending: true
            }]
        });

        const finalEntities = [
            ...communities.entities
        ];

        return {
            entities: finalEntities,
            resultsStatus: finalEntities.length > 0 ? 'FOUND' : 'EMPTY'
        }
    }

    @Get('communities/balances')
    public async getAllComBalances(): Promise<QueryResultBase<BalancesDatastore>> {
        const communities = await this.tokensDatastoreService.queryBalances({
            order: ['balanceLength', {
                descending: true
            }]
        });

        const finalEntities = [
            ...communities.entities
        ];

        return {
            entities: finalEntities,
            resultsStatus: finalEntities.length > 0 ? 'FOUND' : 'EMPTY'
        }
    }

}
