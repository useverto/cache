import { ArweaveClientService } from "../../services/core/arweave/arweave-client.service";
import { ContractService } from "../../services/contracts/contract.service";

const arweaveClientService = new ArweaveClientService();
const contractService = new ContractService(arweaveClientService);

addEventListener('message', async e => {
    const {contractId} = e.data;
    try {
        console.log(`Processing ${contractId}`);
        const state = await contractService.processState(contractId);
        // @ts-ignore
        postMessage({
            contractId,
            state,
            type: 'result'
        });
        console.log(`Execution for ${contractId} has finished`);
    } catch(ex) {
        console.error(`Exception caught for ${contractId}`);
        // @ts-ignore
        postMessage({
            contractId,
            ex,
            type: 'error'
        })
    }
});
