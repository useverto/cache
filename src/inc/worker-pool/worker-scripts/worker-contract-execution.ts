import {ArweaveClientService} from "../../services/core/arweave/arweave-client.service";
import {ContractService} from "../../services/contracts/contract.service";
import {cleanExecution} from "../../../utils/commons";
import {Interceptors} from "smartweave-verto";
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

let vwaps: Record<any, Array<any>> = {};
let latestVwapBlockCachedGlobal: Record<any, Record<any, any> | undefined> = {};

Interceptors.setContractInterceptor(clobContract, async (contractId: string, state: any, interactionNumber: number, height: number) => {
    const { pairs }: { pairs: Array<any> } = state;
    if(pairs) {
        for (let pairItem of pairs) {
            const { pair, priceData }: { pair: [string, string], priceData: any } = pairItem;
            if(!priceData) { return; }
            const pairString = pair.join(",");
            if(!latestVwapBlockCachedGlobal[pairString]) {
                const latestVwapBlockCached = await gcpDatastoreService.getSingle<VwapsDatastore>(
                    // @ts-ignore
                    gcpDatastoreService.createKey("LATEST_VWAPS", pairString)
                );
                if(latestVwapBlockCached) {
                    latestVwapBlockCachedGlobal[pairString] = latestVwapBlockCached;
                }
            }
            const latestVwapForPair = latestVwapBlockCachedGlobal[pairString];
            if(!latestVwapForPair || latestVwapForPair && (((priceData.block > Number(latestVwapForPair.block)) || ((priceData.block >= Number(latestVwapForPair.block) && (priceData.vwap != Number(latestVwapForPair.vwap)) || (priceData.dominantToken != latestVwapForPair.dominantToken)))))) {
                if(!vwaps[pairString]) {
                    vwaps[pairString] = JSON.parse(await gcpContractStorage.fetchTokenVwaps(pair) || '[]');
                }
                vwaps[pairString].push({
                    block: priceData.block,
                    vwap: priceData.vwap,
                    dominantToken: priceData.dominantToken
                });

                latestVwapBlockCachedGlobal[pairString] = priceData;
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
        if(contractId == clobContract) {
            const vwapsIfAny = Object.keys(vwaps);
            for (const pair of vwapsIfAny) {
                const priceData = vwaps[pair];
                const latestPriceData = priceData[priceData.length - 1];
                // @ts-ignore
                await gcpContractStorage.uploadVwaps(pair.split(","), vwaps[pair]);
                await gcpDatastoreService.saveFull<VwapsDatastore>({
                    // @ts-ignore
                    kind: "LATEST_VWAPS",
                    id: pair,
                    data: {
                        pair: pair,
                        block: latestPriceData.block,
                        vwap: latestPriceData.vwap,
                        dominantToken: latestPriceData.dominantToken
                    }
                });
            }
            latestVwapBlockCachedGlobal = {};
            vwaps = {};
        }
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
