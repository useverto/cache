import { ArweaveClientService } from "../../services/core/arweave/arweave-client.service";
import { ContractService } from "../../services/contracts/contract.service";

const arweaveClientService = new ArweaveClientService();
const contractService = new ContractService(arweaveClientService);

addEventListener('message', async e => {
    const {contractId} = e.data;
    try {
        const state = await contractService.processState(contractId);
        // @ts-ignore
        postMessage({
            contractId,
            state,
            type: 'result'
        });
    } catch(ex) {
        postMessage({
            contractId,
            type: 'error'
        })
    }
});
