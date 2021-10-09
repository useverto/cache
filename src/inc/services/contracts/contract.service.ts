import { readContract } from "smartweave";
import {ContractResult} from "../../common.model";
import {Injectable} from "@nestjs/common";
import {ArweaveClientService} from "../core/arweave/arweave-client.service";

@Injectable()
export class ContractService {

    constructor(private readonly arweaveClient: ArweaveClientService) {
    }

    async processState<State = any>(contractId: string): Promise<ContractResult<State>> {
        const arweaveClient = this.arweaveClient.getClient();
        const response = await readContract(arweaveClient,
            contractId,
            undefined,
            true);

        return {
            state: response.state,
            validity: response.validity,
        }
    }

}
