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
import {WorkerProcessPostResult} from "../../../worker-pool/model";

/**
 * This service represents the interaction between contracts and the worker pool.
 * This service is responsible for initializing common behaviors as well as interacting with the worker pool.
 */
@Injectable()
export class ContractWorkerService {

    private workerPool: WorkerPool;

    constructor(private readonly gcpContractStorage: GcpContractStorageService,
                private readonly gcpDatastoreService: GcpDatastoreService) {
        this.initializeWorker();
        this.initializeBehaviors();
        this.initializeCommunityContractHandler();
    }

    /**
     * Sends a contract to the worker pool
     * @param contractId Contract ID to be evaluated inside the worker pool
     * @param waitForResult Whether the result of the contract should be waited
     * @param showResult Whether the result of the contract should be returned in the promise
     */
    public sendContractToWorkerPool(contractId: string, waitForResult?: boolean, showResult?: boolean): WorkerProcessPostResult {
        return this.workerPool.processContractInWorker(contractId, waitForResult || false, showResult || false);
    }

    /**
     * Creates a new dedicated worker only for {@param contractId} to be processed.
     * @param contractId
     */
    public hardSendContract(contractId: string): void {
        this.workerPool.hardProcessContract(contractId);
    }

    /**
     * Initializes the worker pool based on environmental configuration
     */
    private initializeWorker(): void {
        const autoScale = process.env["WORKER_POOL_AUTOSCALE"];
        this.workerPool = new WorkerPool({
            autoScale: autoScale === 'true' || (autoScale as any) === true,
            size: parseInt(process.env["WORKER_POOL_SIZE"]!),
            contractsPerWorker: parseInt(process.env["WORKER_CONTRACTS_PER_WORKER"]!)
        });
    }

    /**
     * Injects behaviors to be executed every time a contract is evaluated
     * Such as: Uploading the state to the google cdn,
     *          uploading the contract address and relation with the holders
     *          Saving the metadata of the contract
     *
     */
    private initializeBehaviors(): void {
        this.workerPool.setOnReceived((contractId, state) => {
            this.gcpContractStorage.uploadState(contractId, state, true);
            this.uploadAddress(contractId, state);
            const realState = state?.state;
            this.gcpDatastoreService.saveFull<ContractsDatastore>({
                kind: DatastoreKinds.CONTRACTS,
                id: contractId,
                data: {
                    contractId,
                    updated: new Date().getTime(),
                    ticker: realState?.ticker,
                    name: realState?.name,
                    title: realState?.title,
                    description: realState?.description,
                    owner: realState?.owner,
                    allowMinting: realState?.allowMinting
                }
            });
        });
    }

    /**
     * Saves the relation between an address found in the balances of the contract, and the contract.
     */
    private async uploadAddress(contractId: string, state: any): Promise<void> {
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

    /**
     * Executes behaviors for community contract processing. Such as storing the tokens that are present in the community contracts
     * And storing the usernames and addresses.
     */
    private initializeCommunityContractHandler(): void {
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
