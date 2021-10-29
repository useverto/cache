import {Controller, Get, Post, UseGuards} from "@nestjs/common";
import {InternalAuthGuard} from "../commons/guards/internal-auth.guard";
import {ContractWorkerService} from "../../inc/services/core/contract-worker/contract-worker.service";
import {Constants} from "../../inc/constants";
import {GcpDatastoreService} from "../../inc/services/core/gcp-datastore/gcp-datastore.service";
import {DatastoreKinds} from "../../inc/services/core/gcp-datastore/model";
import {GcpContractStorageService} from "../../inc/services/core/gcp-contract-storage/gcp-contract-storage.service";

@Controller('worker-pool')
@UseGuards(InternalAuthGuard)
export class WorkerPoolController {

    constructor(private readonly contractWorkerService: ContractWorkerService,
                private readonly gcpDatastoreService: GcpDatastoreService,
                private readonly gcpContractStorageService: GcpContractStorageService) {
    }

    @Post('execute-community-contract')
    processQueue(): void {
        this.contractWorkerService.hardSendContract(Constants.COMMUNITY_CONTRACT);
    }

    @Post('execute-all-contracts')
    async processContracts() {
        const contracts = await this.getAllContracts();
        return contracts.map(contractObject => ({
            contractId: contractObject.contractId,
            ...this.contractWorkerService.sendContractToWorkerPool(contractObject.contractId)
        }));
    }

    @Post('execute-missing-contracts')
    async findMissingContracts() {
        const contracts = await this.getAllContracts();
        const inStorage = await this.gcpContractStorageService.findAllContractsInStorage();
        // @ts-ignore
        const flatten = Object.assign(...inStorage);
        const missingContracts = contracts.filter(item => flatten[item.contractId] === undefined);
        [
            {
                "lister": "t8",
                "contractId": "-phOe9rYuCJDKAnWHHnbD33Wt-4eOU24PY6bGdmLaeQ",
                "type": "art"
            },
            {
                "contractId": "2GX6k-mPCDpvwtujLktzmyM5y-2H_43craxB35u5tM0",
                "type": "art",
                "lister": "t8"
            },
            {
                "type": "art",
                "contractId": "6oWoFoECS-h1IViQ6b6zqtugSEkRyzVb5YxNgpWpyCA",
                "lister": "t8"
            },
            {
                "contractId": "8VYgR0V4DTV0Enkjrjepz_wSqWi_Fwk59tmPgB1Xc98",
                "type": "art",
                "lister": "t8"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "AIQTrJR7bkohq5QIA9g9xTH3qVAfXGnrJjT9AZ8VFh8"
            },
            {
                "contractId": "Ctk3e7Um0pa5yaJhYdnueGoO-m-vvE5ITlcHCbjJULs",
                "lister": "t8",
                "type": "art"
            },
            {
                "contractId": "FhUnxweppoG6n1JgxsaXgFGAT1wfpvDjogYCoaZKWLI",
                "type": "art",
                "lister": "t8"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "Hu54hG-uA-SgkNCPsv_5VkOg5JL9GvGzkzKBwVsZY7k"
            },
            {
                "contractId": "JeexCqdOp9aSxIpYSCHDS4RfNTfuppGA67iTZXBztL0",
                "type": "art",
                "lister": "t8"
            },
            {
                "type": "community",
                "lister": "houlam",
                "contractId": "LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8"
            },
            {
                "type": "art",
                "contractId": "NEA_n2mnAwu-iFYVyQ8durXvGMmf0v6V5cTJR6XDpGc",
                "lister": "t8"
            },
            {
                "lister": "t8",
                "contractId": "NptgO6cEP0zoFbqEveeYqC7Y5n7foIw2fOthd6FSRUo",
                "type": "art"
            },
            {
                "type": "art",
                "contractId": "OGBCnXICyGLvgEZomtATAgojAHqmYPBLnNX4UJ92_WI",
                "lister": "t8"
            },
            {
                "lister": "t8",
                "contractId": "OPytbREoxWQWh41B4fM7Dwltwfel0N_38r4aRhlYPTM",
                "type": "art"
            },
            {
                "contractId": "Re0YCfimHO3chtEELDODMheD07DB52ExhisUcIp_zfk",
                "lister": "t8",
                "type": "art"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "U0zMScFjmVWwc-KRZbGNhUo5ZtkIq2fM6zTQT_6PtsI"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "U6R5E_sjZ8k9BFlyWtgQGvJ7JZ1n1JVgJ4tkIkutdes"
            },
            {
                "type": "art",
                "contractId": "V5nBl0YW-hnRyvqxaOqNTj0v8PSAoYvJXuThlUufBYo",
                "lister": "t8"
            },
            {
                "lister": "t8",
                "type": "art",
                "contractId": "WB0YWOTbxgPaoTLDnAv1rj85Je-k0GmSUbA1Ytf5_xg"
            },
            {
                "type": "art",
                "contractId": "WoAgbsT5KQmceq7Gwv6HbEP5BTOC_2xcGZDlHLiwEPo",
                "lister": "t8"
            },
            {
                "type": "art",
                "contractId": "_GxuoQ3kEwhy3YYvdi-vFl_ASuNY81tivJdh0XqdLHo",
                "lister": "t8"
            },
            {
                "contractId": "_Od6aMKnzyPve0gjqeZdDH1PQAVsMqi3bSBMFOoNfH8",
                "type": "art",
                "lister": "t8"
            },
            {
                "type": "community",
                "lister": "martonlederer",
                "contractId": "bG4FzHB19RclVEU3pimgtw1oijono0y-XfDRZR_Nlhc"
            },
            {
                "lister": "t8",
                "type": "art",
                "contractId": "cJJRpXJNSN2fdBHK_01ARkZYpMe3MEHoCTWroO__XOg"
            },
            {
                "contractId": "cKes_TiuiagcHPmRke0zX9ptsmWxcL0rxGirQAgK2UQ",
                "type": "art",
                "lister": "t8"
            },
            {
                "lister": "t8",
                "contractId": "dIi92AJ3Wt-Sg2Ijh96PKcs7h8uS7kMfB-ixX5ziJio",
                "type": "art"
            },
            {
                "lister": "t8",
                "contractId": "fu3QK6xXX2chB5LQNNWzW4IEui4UBdMW5j-ZNmo1BPI",
                "type": "art"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "gywh81KSG-iQwAQfTn1ocmcZRJg-nXCSxg0dp0bPCkI"
            },
            {
                "contractId": "h5hX8daayjYZ87GvN_m6wmwHBSETZlz-XMN9Tth_w1k",
                "lister": "t8",
                "type": "art"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "hwslQhgUAvGHtbt0hcMW59ZWrz0M_hBtNQrOfwTT294"
            },
            {
                "type": "art",
                "contractId": "iddlgoyiKlikSdzaZCuXj4p2kc90YbmV52jdlgjdfdk",
                "lister": "t8"
            },
            {
                "lister": "t8",
                "contractId": "jBLxVVBG-G0JMmjRb75R_b5l3N3drDUpG4zVUe2Fw54",
                "type": "art"
            },
            {
                "contractId": "kFEZNhgUS2YcU4bHZpUFgv-1-3bUJHoXN0XLbSjMIrg",
                "type": "art",
                "lister": "t8"
            },
            {
                "contractId": "kSsBVz_MokadYYDNXwyFWZPQw0Uw0RvRe9dyVHfBC88",
                "lister": "t8",
                "type": "art"
            },
            {
                "type": "art",
                "contractId": "lxpbichlFmF4C0gYsrEs3pupVfzg9ctdQAfDqPzjRSw",
                "lister": "t8"
            },
            {
                "contractId": "pMdQXi8saSApwMG2KoT8SDeGDVkNi8N65MLFY0MyOK8",
                "type": "art",
                "lister": "t8"
            },
            {
                "contractId": "pUZ2HayhA3OK_E2bhN1xPQazlqys96Ubf4V8jxp2jys",
                "lister": "px",
                "type": "art"
            },
            {
                "lister": "t8",
                "type": "art",
                "contractId": "tWFZdS7_WVlcwPVqiKa_xvi8i22no806PRbW9GVbCJg"
            },
            {
                "type": "community",
                "contractId": "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
                "lister": "martonlederer"
            },
            {
                "lister": "t8",
                "contractId": "v0_GM-DJHW2ORdU0DquLCpRsCqmJretBkJTKGpRC4Ik",
                "type": "art"
            },
            {
                "type": "art",
                "lister": "t8",
                "contractId": "xjroXiBYptN1CQn4I4DLWmIWjqyoRXFWZEuGk97rZe0"
            }
        ].forEach((item) => {
            this.contractWorkerService.sendContractToWorkerPool(item.contractId);
        });
        return missingContracts;
    }

    private async getAllContracts() {
        return (await this.gcpDatastoreService.getAll(DatastoreKinds.COMMUNITY_TOKENS))
            .flat()
            .filter(item => item.contractId);

    }

}
