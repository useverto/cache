import {Injectable} from "@nestjs/common";
import {WorkerPool} from "../../../worker-pool/worker-pool";
import {GcpContractStorageService} from "../gcp-contract-storage/gcp-contract-storage.service";
import {GcpDatastoreService} from "../gcp-datastore/gcp-datastore.service";
import {ContractsDatastore} from "../gcp-datastore/kind-interfaces/ds-contracts";
import {DatastoreKinds} from "../gcp-datastore/model";
import {Constants} from "../../../constants";
import {CommunityTokensDatastore} from "../gcp-datastore/kind-interfaces/ds-community-tokens";
import {CommunityPeopleDatastore} from "../gcp-datastore/kind-interfaces/ds-community-people";
import {ContractsAddressDatastore} from "../gcp-datastore/kind-interfaces/ds-contracts-vs-address";

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

    public hardSendContract(contractId: string) {
        this.workerPool.hardProcessContract(contractId);
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
            this.uploadAddress(contractId, state);
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

    private async uploadAddress(contractId: string, state: any) {
        const balancesInState = state?.state?.balances;
        if(balancesInState) {
            const balances: Array<string> | undefined = Object.keys(balancesInState);
            balances?.map(async (addressId) => {
                this.gcpDatastoreService.saveFull<ContractsAddressDatastore>({
                    kind: DatastoreKinds.CONTRACTS_VS_ADDRESS,
                    id: `${contractId}-${addressId}`,
                    data: {
                        contract: contractId,
                        address: addressId
                    }
                })
            });
        }
    }

    private initializeCommunityContractHandler() {
        this.workerPool.setReceiver(Constants.COMMUNITY_CONTRACT,
            (contractId: string, parentState: any) => {
                if(parentState) {
                    let state = parentState.state;
                    if(!state) {
                        return;
                    }
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
                                kind: DatastoreKinds.COMMUNITY_PEOPLE,
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
