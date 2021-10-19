import {Controller, Get, Param} from "@nestjs/common";
import {ContractsAddressDatastoreService} from "../../inc/services/contracts-datastore/contracts-address-datastore.service";

@Controller('users')
export class UsersController {

    constructor(private readonly contractsAddressDatastoreService: ContractsAddressDatastoreService) {
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

}
