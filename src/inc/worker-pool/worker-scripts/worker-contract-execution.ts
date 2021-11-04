import { ArweaveClientService } from "../../services/core/arweave/arweave-client.service";
import { ContractService } from "../../services/contracts/contract.service";
import {cleanExecution} from "../../../utils/commons";

const arweaveClientService = new ArweaveClientService();
const contractService = new ContractService(arweaveClientService);

cleanExecution();

addEventListener('message', async e => {
    const { contractId, workerToUse } = e.data;

    // @ts-ignore
    postMessage({
        contractId,
        workerToUse,
        type: 'feedback'
    });

    try {
        console.log(`Processing ${contractId}`);
        const state = await contractService.processState(contractId);
        // @ts-ignore
        postMessage({
            contractId,
            state,
            workerToUse,
            type: 'result'
        });
        console.log(`Execution for ${contractId} has finished`);
    } catch(ex) {
        console.error(`Exception caught for ${contractId}`);
        // @ts-ignore
        postMessage({
            contractId,
            ex,
            workerToUse,
            type: 'error'
        })
    }
});
