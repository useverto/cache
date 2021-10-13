import {Injectable} from "@nestjs/common";
import {WorkerPool} from "../../../worker-pool/worker-pool";
import {GcpContractStorageService} from "../gcp-contract-storage/gcp-contract-storage.service";
import {GcpDatastoreService} from "../gcp-datastore/gcp-datastore.service";
import {ContractsDatastore} from "../gcp-datastore/kind-interfaces/ds-contracts";
import {DatastoreKinds} from "../gcp-datastore/model";
import {Constants} from "../../../constants";
import {CommunityTokensDatastore} from "../gcp-datastore/kind-interfaces/ds-community-tokens";
import {CommunityPeopleDatastore} from "../gcp-datastore/kind-interfaces/ds-community-people";

@Injectable()
export class ContractWorkerService {

    private workerPool: WorkerPool;

    constructor(private readonly gcpContractStorage: GcpContractStorageService,
                private readonly gcpDatastoreService: GcpDatastoreService) {
        this.initializeWorker();
        this.initializeBehaviors();
        this.initializeCommunityContractHandler();
    }

    public sendContractToWorkerPool(contractId: string, waitForResult?: boolean, showResult?: boolean) {
        return this.workerPool.processContractInWorker(contractId, waitForResult, showResult);
    }

    private initializeWorker() {
        const autoScale = process.env["WORKER_POOL_AUTOSCALE"];
        this.workerPool = new WorkerPool({
            autoScale: autoScale === 'true' || (autoScale as any) === true,
            size: parseInt(process.env["WORKER_POOL_SIZE"]),
            contractsPerWorker: parseInt(process.env["WORKER_CONTRACTS_PER_WORKER"])
        });
    }

    private initializeBehaviors() {
        this.workerPool.setOnReceived((contractId, state) => {
            this.gcpContractStorage.uploadState(contractId, state, true);
            this.gcpDatastoreService.saveFull<ContractsDatastore>({
                kind: DatastoreKinds.CONTRACTS,
                id: contractId,
                data: {
                    contractId,
                    updated: new Date().getTime(),
                    ticker: state?.ticker,
                    name: state?.name,
                    title: state?.title,
                    description: state?.description,
                    owner: state?.owner,
                    allowMinting: state?.allowMinting
                }
            });
        });
    }

    private initializeCommunityContractHandler() {
        this.workerPool.setReceiver(Constants.COMMUNITY_CONTRACT,
            (contractId: string, state: any) => {
                if(state) {
                    if(state.tokens) {
                        const tokens: Array<any> = state.tokens;
                        tokens.forEach((item) => {
                            this.gcpDatastoreService.saveFull<CommunityTokensDatastore>({
                                kind: DatastoreKinds.COMMUNITY_TOKENS,
                                id: item.id,
                                data: {
                                    contractId: item.id,
                                    type: item.type,
                                    lister: item.lister
                                }
                            });
                        })
                    }
                    if(state.people) {
                        const users: Array<any> = state.people;
                        users.forEach((item) => {
                            this.gcpDatastoreService.saveFull<CommunityPeopleDatastore>({
                                kind: DatastoreKinds.COMMUNITY_TOKENS,
                                id: item.username,
                                data: {
                                    username: item.username,
                                    addresses: (item.addresses as string[]).join(",")
                                }
                            });
                        })
                    }
                }
            }
        );
    }
}
