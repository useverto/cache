import {Controller, Get, Param, Query} from "@nestjs/common";
import {ContractsAddressDatastoreService} from "../../inc/services/contracts-datastore/contracts-address-datastore.service";
import {TokensDatastoreService} from "../../inc/services/contracts-datastore/tokens-datastore.service";
import {ArtFilter} from "../../inc/services/contracts-datastore/common-filters/token-filters";
import {UsersDatastoreService} from "../../inc/services/contracts-datastore/users-datastore.service";

@Controller('users')
export class UsersController {

    constructor(private readonly contractsAddressDatastoreService: ContractsAddressDatastoreService,
                private readonly tokensDatastoreService: TokensDatastoreService,
                private readonly usersDatastoreService: UsersDatastoreService) {
    }

    @Get('metadata/:username')
    public async getMetadataOfUser(@Param('username') username: string) {
        const queryUsers = await this.usersDatastoreService.queryUsers({
            filters: [
                {
                    property: 'username',
                    operator: '=',
                    value: username
                }
            ]
        });

        const user = queryUsers.entities[0];
        if(user) {
            return {
                ...user,
                addresses: user.addresses.split(',')
            }
        } else {
            return undefined;
        }
    }

    @Get('balances/:address')
    public async getBalancesForUsername(@Param('address') address: string, @Query('username') username: string) {
        const byUsername = username === 'true';
        return byUsername ? (await this.usersDatastoreService.getUserBalancesForUsername(address)) : (await this.usersDatastoreService.getUserBalancesForAddress(address));
    }

    @Get('contracts/:addressId')
    public async getContractsForUser(@Param('addressId') id: string): Promise<Array<string>> {
        const queryContractsInUser = await this.contractsAddressDatastoreService.queryContractsAddress(
            {
                filters: [{
                    property: 'address',
                    operator: '=',
                    value: id
                }]
            }
        );

        if(queryContractsInUser.isEmpty()) {
            return [];
        } else {
            const contracts = queryContractsInUser.entities;
            return contracts.map((item) => item.contract);
        }
    }

    @Get('creations/:username')
    public async getCreationsInUser(@Param('username') username: string): Promise<Array<string>> {
        const queryCreationsWithLister = await this.tokensDatastoreService.queryTokens({
            filters: [
                ArtFilter,
                {
                    property: 'lister',
                    operator: '=',
                    value: username
                }
            ]
        });

        return queryCreationsWithLister.entities.map((item) => item.contractId);
    }

}
