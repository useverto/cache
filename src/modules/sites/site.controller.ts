import {Controller, Get, Param, Query} from "@nestjs/common";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {
    ArtFilter,
    CollectionsFilter,
    CommunitiesFilter
} from "../../inc/services/contracts-datastore/common-filters/token-filters";
import {QueryResult, QueryResultBase} from "verto-internals/services/gcp";
import {CommunityTokensDatastore} from "../../inc/services/core/gcp-datastore/kind-interfaces/ds-community-tokens";
import {BalancesDatastore} from "../../inc/services/core/gcp-datastore/kind-interfaces/ds-balances";
import {GcpContractStorageService} from "../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";
import {Constants} from "../../inc/constants";
import {
    CommunityContract,
    CommunityPeople,
    CommunityToken
} from "verto-internals/interfaces/contracts/community-contract";
import {paginateArray} from "../../utils/commons";
import {PaginationInfo, PaginationResult} from "verto-internals/services/miscellaneous/models";
import {ProcessSearchExecution} from "../../inc/processing/process-search-execution";
import {getNameAndTickerAndLogoAndDescription} from "../../utils/tokens";

@Controller('token')
export class SiteController {

    constructor(private readonly tokensDatastoreService: TokensDatastoreService,
                private readonly gcpContractStorageService: GcpContractStorageService) {
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

    @Get('paginate')
    public async getTokensPaginated(@Query('size') size: string,
                                    @Query('page') page: string,
                                    @Query('type') type: "people" | "tokens"): Promise<PaginationResult<unknown>> {
        const getCommunityContractState = await this.gcpContractStorageService.fetchContractState(Constants.COMMUNITY_CONTRACT);
        const parsedContract: CommunityContract = JSON.parse(getCommunityContractState);
        type PaginatedType = Array<CommunityPeople> | Array<CommunityToken>;
        const searchType = type || "tokens";
        const searchArray = parsedContract[searchType];
        const searchPageSize = parseInt(size || '100');
        const searchPage = parseInt(page || '1');
        const maxItems = searchArray.length;
        let items: Array<unknown> = [];

        if(searchArray) {
            const paginated = paginateArray<PaginatedType>(searchArray, searchPageSize, searchPage);

            if (searchType === "tokens") {
                items = paginateArray(JSON.parse(await this.gcpContractStorageService.fetchTokenSkeleton()), searchPageSize, searchPage);
            } else {
                items = paginated
            }
        }

        const searchInfo: PaginationInfo = {
            count: maxItems,
            pageSize:  searchPageSize,
            page: searchPage,
            maxPages: Math.ceil(maxItems/searchPageSize),
            found: (items || []).length
        }

        return {
            items,
            paginationInfo: searchInfo
        }
    }

}
