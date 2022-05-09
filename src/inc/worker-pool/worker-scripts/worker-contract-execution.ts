import { ArweaveClientService } from "../../services/core/arweave/arweave-client.service";
import { ContractService } from "../../services/contracts/contract.service";
import {cleanExecution} from "../../../utils/commons";
import {Interceptors} from "smartweave-verto";
import {Constants} from "../../constants";
import {VwapsDatastore} from "../../services/core/gcp-datastore/kind-interfaces/ds-vwaps";
import {GcpDatastoreService} from "verto-internals/services/gcp";
import {GcpContractStorageService} from "../../services/core/gcp-contract-storage/gcp-contract-storage.service";
import {GcpStorageService} from "verto-internals/services/gcp/gcp-storage.service";

const arweaveClientService = new ArweaveClientService();
const contractService = new ContractService(arweaveClientService);
const gcpDatastoreService = new GcpDatastoreService();
const gcpContractStorage = new GcpContractStorageService(new GcpStorageService());

// Create a new reference in memory
const clobContract = String(process.env.CLOB_CONTRACT);

Interceptors.setContractInterceptor(clobContract, async (contractId: string, state: any, interactionNumber: number, height: number) => {
    console.log("Interceptor called");
    const { pairs }: { pairs: Array<any> } = state;
    if(pairs) {
        for (let pairItem of pairs) {
            const { pair, priceData }: { pair: [string, string], priceData: any } = pairItem;
            if(!priceData) { return; }
            const pairString = pair.join(",");
            const latestVwapBlockCached = await gcpDatastoreService.getSingle<VwapsDatastore>(
                // @ts-ignore
                gcpDatastoreService.createKey("LATEST_VWAPS", pairString)
            );
            if(!latestVwapBlockCached || latestVwapBlockCached && priceData.block > Number(latestVwapBlockCached.block)) {
                const vwapsForPair: Array<any> = JSON.parse(await gcpContractStorage.fetchTokenVwaps(pair) || '[]');
                vwapsForPair.push({
                    block: priceData.block,
                    vwap: priceData.vwap
                });
                await gcpContractStorage.uploadVwaps(pair, vwapsForPair);
                await gcpDatastoreService.saveFull<VwapsDatastore>({
                    // @ts-ignore
                    kind: "LATEST_VWAPS",
                    id: pairString,
                    data: {
                        pair: pairString,
                        block: priceData.block,
                        vwap: priceData.vwap
                    }
                });
            }
        }
    }
})

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
