import {Interceptors, readContract} from "smartweave-verto";
import {ContractResult} from "../../common.model";
import {Injectable} from "@nestjs/common";
import {ArweaveClientService} from "../core/arweave/arweave-client.service";

/**
 * This service interacts with smartweave for the processing of contracts.
 */
@Injectable()
export class ContractService {

    constructor(private readonly arweaveClient: ArweaveClientService) {
    }

    /**
     * Process a contract based on {@param contractId} and returns the state and validity of the contract.
     * @param contractId
     */
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
