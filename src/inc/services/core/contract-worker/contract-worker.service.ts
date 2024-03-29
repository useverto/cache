import {Injectable} from "@nestjs/common";
import {WorkerPool} from "../../../worker-pool/worker-pool";
import {GcpContractStorageService} from "../gcp-contract-storage/gcp-contract-storage.service";
import {GcpDatastoreService,DatastoreKinds} from "verto-internals/services/gcp";
import {ContractsDatastore} from "../gcp-datastore/kind-interfaces/ds-contracts";
import {Constants} from "../../../constants";
import {CommunityTokensDatastore} from "../gcp-datastore/kind-interfaces/ds-community-tokens";
import {CommunityPeopleDatastore} from "../gcp-datastore/kind-interfaces/ds-community-people";
import {ContractsAddressDatastore} from "../gcp-datastore/kind-interfaces/ds-contracts-vs-address";
import {WorkerProcessPostResult} from "../../../worker-pool/model";
import {RecoverableContractsDatastoreService} from "../../contracts-datastore/recoverable-contracts-datastore.service";
import {DsFailedContracts} from "../gcp-datastore/kind-interfaces/ds-failed-contracts";
import {DsBlacklistedContracts} from "../gcp-datastore/kind-interfaces/ds-blacklisted-contracts";
import {MetricType, WorkerPoolMetrics} from "../../../worker-pool/worker-pool-metrics";
import {BalancesDatastore} from "../gcp-datastore/kind-interfaces/ds-balances";
import {CommunityContract} from "verto-internals/interfaces/contracts/community-contract";
import {ProcessSearchExecution} from "../../../processing/process-search-execution";
import {getNameAndTickerAndLogoAndDescription} from "../../../../utils/tokens";
import {TokensDatastoreService} from "../../contracts-datastore/tokens-datastore.service";

/**
 * This service represents the interaction between contracts and the worker pool.
 * This service is responsible for initializing common behaviors as well as interacting with the worker pool.
 */
@Injectable()
export class ContractWorkerService {

    workerPool: WorkerPool;

    constructor(private readonly gcpContractStorage: GcpContractStorageService,
                private readonly gcpDatastoreService: GcpDatastoreService,
                private readonly recoverableContractDatastoreService: RecoverableContractsDatastoreService,
                private readonly tokenDatastoreService: TokensDatastoreService) {
        this.initializeWorker();
        this.initializeBehaviors();
        this.initializeCommunityContractHandler();
        this.initializeBlacklistedContracts();
        this.recoverContracts();
        this.initializeCustomTimers();
        WorkerPoolMetrics.initializeTimers(gcpDatastoreService);
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
     * Send a contract to the queue
     * @param contractId
     */
    public sendContractToQueue(contractId: string): void {
        this.workerPool.sendContractToQueue(contractId);
    }

    /**
     * Get stats from the worker Pool
     */
    public getStats() {
        return {
            contractsQueue: this.workerPool.contractsQueue.length,
            workers: this.workerPool.workers.length,
            scaledWorkers: this.workerPool.stats.filter((item) => item.workerScaled).length,
            currentContractIdsWorkedOn: this.workerPool.currentContractIdsWorkedOn.length,
            blacklistedContracts: this.workerPool.blackListedContracts?.length
        }
    }

    /**
     * Add contracts being worked on and queue to the list of recoverable.
     */
    public exitContractWorkerPoolSafely(): Array<Promise<any>> {
        const contracts = [
            ...this.workerPool.contractsQueue,
            ...this.workerPool.currentContractIdsWorkedOn
        ];
        this.workerPool.contractsQueue = [];
        this.workerPool.currentContractIdsWorkedOn = [];

        return contracts.map(async (item) => {
            return await this.recoverableContractDatastoreService.saveContract(item)
        });
    }

    /**
     * Cache Full Contract skeleton
     */
    public async cacheFullContractSkeleton(): Promise<void> {
        const getCommunityContractState = await this.gcpContractStorage.fetchContractState(Constants.COMMUNITY_CONTRACT);
        const parsedContract: CommunityContract = JSON.parse(getCommunityContractState);
        const tokens = parsedContract["tokens"];

        const tokenIds = tokens.map((item) => item.id);
        Promise.all(tokenIds.map(async (contractId) => {
            try {
                return {
                    contractId,
                    state: JSON.parse(await this.gcpContractStorage.fetchContractState(contractId) || "{}"),
                    metadata: await this.tokenDatastoreService.getToken(contractId)
                }
            } catch(e) {
                return undefined;
            }
        })).then(async (data) => {
            const skeletons = data.filter(item => item !== undefined).map((item) => {
                try {
                    const state = item!.state;
                    const {id, ticker, name, logo} = getNameAndTickerAndLogoAndDescription(item!.contractId, state || {});
                    const {type, lister} = item!.metadata as any;
                    const {items} = state as any;
                    const listerMetadata = parsedContract["people"].find((item) => item.username === lister) as any || {};
                    return {
                        id,
                        ticker,
                        name,
                        logo,
                        type: type || "custom",
                        lister: listerMetadata,
                        items
                    }
                } catch {
                    return {}
                }
            });

            await this.gcpContractStorage.uploadSkeletons(skeletons);
        });

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
        this.workerPool.setOnReceived(async (contractId, state) => {
            await this.processOnReceive(contractId, state);
        });

        this.workerPool.setOnError(async (contractId, exception) => {
            WorkerPoolMetrics.addMetric(MetricType.FAILED_CONTRACTS, (current) => current + 1);
            await this.handleErrorContract(contractId, exception);
        });

        this.workerPool.setOnFaulty(async (contractId: string) => {
            WorkerPoolMetrics.addMetric(MetricType.BLACKLISTED_CONTRACTS, (current) => current + 1);
           await this.handleFaultyContract(contractId);
        });
    }

    private async processOnReceive(contractId: string, state: any) {
        await this.gcpContractStorage.uploadState(contractId, state, true);
        await this.deleteFromFailedContracts(contractId);
        await this.uploadAddress(contractId, state);
        await this.uploadBalanceNumbers(contractId, state);
        const realState = state?.state;
        const getSingle = await this.gcpDatastoreService.getSingle(this.gcpDatastoreService.createKey(DatastoreKinds.CONTRACTS, contractId));
        if(!getSingle) {
            WorkerPoolMetrics.addMetric(MetricType.NEW_CONTRACTS, (current) => current + 1);
        }
        await this.gcpDatastoreService.saveFull<ContractsDatastore>({
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
    }

    /**
     * Saves the relation between an address found in the balances of the contract, and the contract.
     */
    private async uploadAddress(contractId: string, state: any): Promise<void> {
        const balancesInState = state?.state?.balances;
        if(balancesInState) {
            const balances: Array<string> | undefined = Object.keys(balancesInState);
            await Promise.allSettled(balances?.map(async (addressId) => {
                const kind = DatastoreKinds.CONTRACTS_VS_ADDRESS;
                const key = `${contractId}-${addressId}`;
                const getSingle = await this.gcpDatastoreService.getSingle(this.gcpDatastoreService.createKey(kind, key));
                if(!getSingle) {
                    WorkerPoolMetrics.addMetric(MetricType.ADDRESS_RELATIONSHIP, (current) => current + 1);
                    await this.gcpDatastoreService.saveFull<ContractsAddressDatastore>({
                        kind: kind,
                        id: key,
                        data: {
                            contract: contractId,
                            address: addressId
                        }
                    });
                }
            }));
        }
    }

    private async uploadBalanceNumbers(contractId: string, state: any): Promise<void> {
        const balancesInState = state?.state?.balances;
        const kind = DatastoreKinds.BALANCES;
        const getSingle = await this.gcpDatastoreService.getSingle(this.gcpDatastoreService.createKey(DatastoreKinds.COMMUNITY_TOKENS, contractId));
        if(balancesInState && getSingle && getSingle?.type === "community") {
            let balancesLength = Object.keys(balancesInState).length;
            await this.gcpDatastoreService.saveFull<BalancesDatastore>({
                kind: kind,
                id: contractId,
                data: {
                    contractId: contractId,
                    balanceLength: balancesLength
                }
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
                this.processCommunityContract(contractId, parentState);
            }
        );
    }

    private async processCommunityContract(contractId: string, parentState: any) {
        if(parentState) {
            let state = parentState.state;
            if(!state) {
                return;
            }
            if(state.tokens) {
                const tokens: Array<any> = state.tokens;
                await Promise.allSettled(tokens.map(async (item) => {
                    await this.gcpDatastoreService.saveFull<CommunityTokensDatastore>({
                        kind: DatastoreKinds.COMMUNITY_TOKENS,
                        id: item.id,
                        data: {
                            contractId: item.id,
                            type: item.type,
                            lister: item.lister
                        }
                    });
                }));
            }
            if(state.people) {
                const users: Array<any> = state.people;
                await Promise.allSettled(users.map(async (item) => {
                    const kind = DatastoreKinds.COMMUNITY_PEOPLE;
                    const id = item.username;
                    const addresses = ((item.addresses || []) as string[]).join(",");

                    const getSingle = await this.gcpDatastoreService.getSingle<CommunityPeopleDatastore>(this.gcpDatastoreService.createKey(kind, id));
                    if(!getSingle || getSingle && getSingle.addresses !== addresses) {
                        await this.gcpDatastoreService.saveFull<CommunityPeopleDatastore>({
                            kind: kind,
                            id: id,
                            data: {
                                username: id,
                                addresses: addresses
                            }
                        });
                    }

                    if(!getSingle) {
                        WorkerPoolMetrics.addMetric(MetricType.NEW_PEOPLE, (current) => current + 1);
                    }
                }));
            }
        }
    }

    private async handleErrorContract(contractId: string, exception: any) {
        console.error(exception);
        await this.gcpDatastoreService.saveFull<DsFailedContracts>({
            kind: DatastoreKinds.FAILED_CONTRACTS,
            id: contractId,
            data: {
                contractId: contractId
            }
        });
    }

    private async handleFaultyContract(contractId: string) {
        await this.gcpDatastoreService.saveFull<DsBlacklistedContracts>({
            kind: DatastoreKinds.BLACKLISTED_CONTRACTS,
            id: contractId,
            data: {
                contractId
            }
        });
    }

    private async deleteFromFailedContracts(contractId: string) {
        const isContractMarkedAsFailed = await this.gcpDatastoreService.getSingle(
            this.gcpDatastoreService.createKey(DatastoreKinds.FAILED_CONTRACTS, contractId)
        );
        if(isContractMarkedAsFailed) {
            await this.gcpDatastoreService.delete(this.gcpDatastoreService.createKey(DatastoreKinds.FAILED_CONTRACTS, contractId));
        }
    }

    /**
     * Recover all the contracts (failed and recoverable) and send them to the worker pool
     */
    private async recoverContracts() {
        const contracts = [
            ...await this.recoverableContractDatastoreService.getAllAndClean(),
            ...await this.recoverableContractDatastoreService.getAllAndClean('failed')
        ];
        contracts.forEach((item) => {
            this.sendContractToWorkerPool(item.contractId);
        });
    }

    private async initializeBlacklistedContracts() {
        this.workerPool.blackListedContracts = (await this.gcpDatastoreService.getAll(DatastoreKinds.BLACKLISTED_CONTRACTS))
            .flat()
            .filter(item => item.contractId)
            .map(item => item.contractId);
    }

    private async initializeCustomTimers() {
        this.workerPool.addTimer(() => this.initializeBlacklistedContracts(), 60000);
    }

}
