import {GcpStorageService} from "verto-internals/services/gcp/gcp-storage.service";
import {GcpContractStorageService} from "../../services/core/gcp-contract-storage/gcp-contract-storage.service";
import {GcpDatastoreService} from "verto-internals/services/gcp";
import {TokensDatastoreService} from "../../services/contracts-datastore/tokens-datastore.service";

const gcpStorageService = new GcpStorageService();
const gcpContractStorageService = new GcpContractStorageService(gcpStorageService);
const gcpDatastoreService = new GcpDatastoreService();
const tokenDatastoreService = new TokensDatastoreService(gcpDatastoreService);

self.onmessage = async (event: MessageEvent) => {
    const { command, contractId } = event.data;
    try {
        switch (command) {
            case "fetch-state":
                const state = JSON.parse(await gcpContractStorageService.fetchContractState(contractId) || "{}");
                // @ts-ignore
                self.postMessage(state);
                break;

            case "fetch-token-metadata":
                const metadata = await tokenDatastoreService.getToken(contractId);
                // @ts-ignore
                self.postMessage(metadata);
                break;
        }
    } catch {
        // @ts-ignore
        self.postMessage("ERROR");
    }
}
