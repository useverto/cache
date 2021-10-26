import {WorkerItem, WorkerPoolConfiguration, WorkerProcessPostResult, WorkerResult, WorkerStats} from "./model";
import Worker from 'web-worker';
import path from "path";

export type OnReceived = (contractId: string, state: any) => void | Promise<void>;

/**
 * This class is known as the worker pool.
 * It is responsible for creating a stable pool of workers with distributed tasks for contract processing and caching.
 * It can be used as a standalone class with no additional behavior.
 */
export class WorkerPool {

    contractsQueue: Array<string> = [];
    workers: Array<WorkerItem> = [];
    stats: Array<WorkerStats> = [];
    promises: Array<WorkerResult> = [];
    currentContractIdsWorkedOn: Array<string> = [];
    timers: Array<any> = [];

    private globalOnReceived: OnReceived;
    private receivers: Map<string, OnReceived> = new Map<string, OnReceived>();

    constructor(private readonly configuration: WorkerPoolConfiguration) {
        this.initialize();
        this.setTimers();
    }

    /**
     * Sends a contract to the worker pool in order to process its state in different threads
     * @param contractId Contract to be processed
     * @param waitForResult Whether we should wait for the contract to be fully processed
     * @param showResult Whether we want our result to return the latest state of the contract
     */
    public processContractInWorker(contractId: string, waitForResult: boolean): WorkerProcessPostResult;
    public processContractInWorker(contractId: string, waitForResult: boolean, showResult: boolean): WorkerProcessPostResult;
    public processContractInWorker(contractId: string): WorkerProcessPostResult;
    public processContractInWorker(contractId: string, waitForResult?: boolean, showResult?: boolean): WorkerProcessPostResult {
        // @ts-ignore
        let returnData: WorkerProcessPostResult = {};

        if(!this.currentContractIdsWorkedOn.some(item => item === contractId)) {
            const {autoScale, contractsPerWorker} = this.configuration;
            const freeWorker = this.stats.find((item) => item.contractsOnProcessing < contractsPerWorker);
            let workerToUse: number | undefined = undefined;

            if (!freeWorker) {
                if (autoScale) {
                    workerToUse = this.createWorker(true);
                } else {
                    this.contractsQueue.push(contractId);
                    returnData.state = 'ADDED_TO_QUEUE';
                }
            } else {
                workerToUse = freeWorker.workerId;
            }

            if (workerToUse != undefined && workerToUse >= 0) {
                this.sendContractToWorker(contractId, workerToUse);
                returnData.state = 'CONTRACT_SENT';
            }

            if(waitForResult) {
                const promiseForResult = this.createPromiseResultContext(contractId, showResult || false);
                this.promises.push(promiseForResult);
                returnData.data = {
                    worker: workerToUse,
                    contractId,
                    promiseContext: promiseForResult
                };
            }
        } else {
            this.contractsQueue.push(contractId);
            returnData.state = 'CURRENTLY_PROCESSING';
        }

        return returnData;
    }

    /**
     * Creates a dedicated instance (worker) for a contract to be processed
     * @param contractId
     */
    public hardProcessContract(contractId: string): void {
        const worker = this.createWorker(true);
        this.sendContractToWorker(contractId, worker);
    }

    /**
     * Sets a callback to be applied to the execution of all the contracts.
     * Useful to add layers of processing on to the result of the states
     * @param callback
     */
    public setOnReceived(callback: OnReceived): void {
        this.globalOnReceived = callback;
    }

    /**
     * Sets a callback for an specific contract.
     * This means, it'll only be executed when that contract is processed unlike {@link setOnReceived} which is for all contracts.
     * @param contractId
     * @param cb
     */
    public setReceiver(contractId: string, cb: OnReceived): void {
        this.receivers.set(contractId, cb);
    }

    /**
     * Removes the callback processor for a specific contract
     * @param contractId
     */
    public removeReceiver(contractId: string): void {
        this.receivers.delete(contractId);
    }

    /**
     * Creates a worker and initializes its behaviors
     * @param workerScaled Whether the worker was created due to scalation
     * @private
     */
    private createWorker(workerScaled = false): number {
        const worker = new Worker(
            path.join(__dirname, "./worker-scripts/worker-contract-execution.js"),
            {
                type: 'module'
            }
        );

        // @ts-ignore
        // .push returns one number higher than the index
        const workerId = this.workers.push(undefined) - 1;

        this.workers[workerId] = {
            worker: this.initializeBehaviors(worker, workerId),
            id: workerId
        };

        this.stats.push({
            workerId,
            contractsOnProcessing: 0,
            workerScaled
        });
        return workerId;
    }

    /**
     * Sends a contract to an specific worker, instead of the worker pool.
     * @param contractId
     * @param workerToUse
     */
    private sendContractToWorker(contractId: string, workerToUse: number): void {
        const stat = this.updateStats(workerToUse, (localStats) => {
            return {
                ...localStats,
                contractsOnProcessing: localStats.contractsOnProcessing + 1
            }
        });
        if (stat) {
            this.workers[stat.workerId]?.worker?.postMessage({
                contractId
            });
            this.currentContractIdsWorkedOn.push(contractId);
        }
    }

    /**
     * Creates the context of a {@link WorkerResult} to be returned
     * @param contractId
     * @param showResult
     * @private
     */
    private createPromiseResultContext(contractId: string, showResult: boolean): WorkerResult {
        let resolver, catcher;
        let promiseWorker = new Promise((_resolve, _reject) => {
            resolver = _resolve;
            catcher = _reject;
        })
        return {
            promise: promiseWorker,
            resolver: (resolver)!,
            catcher: (catcher)!,
            contractId,
            showResult
        };
    }

    /**
     * Initializes the behaviors of a worker (on receive, errors, etc)
     * Responsible for managing the states of the worker pool
     * and invoking the contract execution callbacks
     * and resolving promises attached to the contract id.
     * @param worker
     * @param workerId
     * @private
     */
    private initializeBehaviors(worker: Worker, workerId: number): Worker {

        const decreaseContractsOnProcessing = () => this.updateStats(workerId, (localStats) => {
            const contractsOnProcessing = localStats.contractsOnProcessing;
            return {
                ...localStats,
                contractsOnProcessing: contractsOnProcessing === 1 ? 0 : (contractsOnProcessing - 1)
            }
        });

        const resolvePromises = (contractId: string, data: any, isError: boolean) => {
            const result = this.promises.find((item) => item.contractId === contractId);
            if(result) {
                if (!isError) {
                    result.resolver(result.showResult ? data.state : true);
                } else {
                    result.catcher(data.ex);
                }

                this.promises = this.promises.filter((item) => item.contractId !== contractId);
            }
        }

        const removeContractLock = (contractId: string) => {
            this.currentContractIdsWorkedOn = this.currentContractIdsWorkedOn.filter(contract => contract !== contractId);
        }

        worker.addEventListener('message', e => {
            const data = e.data;
            const type = data.type;
            const contractId = data.contractId;
            const state = data.state;

            decreaseContractsOnProcessing();
            removeContractLock(contractId);

            const isError = type === 'error';

            if(this.globalOnReceived && !isError) {
                this.globalOnReceived(contractId, state);
                console.log(`Global handler for ${contractId} has been invoked`);
            }

            if(this.receivers.has(contractId) && !isError) {
                const receiver: OnReceived = this.receivers.get(contractId)!;
                receiver(contractId, state);
            }

            resolvePromises(contractId, data, isError);
        });

        worker.addEventListener("error", (error) => {
            console.log("Error in worker", error);
            decreaseContractsOnProcessing();
        });

        return worker;
    }

    /**
     * Updates the current states of a worker
     * @param workerId
     * @param processor
     * @private
     */
    private updateStats(workerId: number, processor: (stats: WorkerStats) => WorkerStats): WorkerStats | undefined {
        const stat = this.stats.findIndex((item) => item.workerId === workerId);
        if(stat >= 0) {
            const statState = this.stats[stat];
            const newStats = processor(statState);
            this.stats[stat] = {
                ...statState,
                ...newStats
            }
        }
        return stat >= 0 ? this.stats[stat] : undefined;
    }

    /**
     * Sets timer for deletion of scaled workers (every 60000ms)
     * Sets timer for processing contracts in the queue (every 60000ms)
     * @private
     */
    private setTimers(): void {
        this.timers[0] = setInterval(() => {
            this.deleteScaledWorkers();
        }, 60000);

        this.timers[1] = setInterval(() => {
            this.processQueue();
        }, 60000);
    }

    /**
     * Removes and terminates all the workers that were scaled and are not processing any contract
     * @private
     */
    private deleteScaledWorkers(): void {
        const scaledWorkers = this.stats.filter(stat => stat.workerScaled && stat.contractsOnProcessing <= 0);
        scaledWorkers.forEach(({ workerId }) => {
            this.workers.filter((item) => item.id === workerId)
                .map((workerItem) => {
                    workerItem.worker.terminate();
                    return workerItem;
                });
            this.workers = this.workers.filter((item) => item.id !== workerId);
        });
        this.stats = this.stats.filter(stat => !stat.workerScaled);
    }

    /**
     * Calls for execution of contracts added to the queue
     * @private
     */
    private processQueue(): void {
        const temporaryList = [...this.contractsQueue];
        temporaryList.forEach(
            (contractId) => {
                this.contractsQueue = this.contractsQueue.filter(item => item !== contractId);
                this.processContractInWorker(contractId);
            }
        );
    }

    /**
     * Creates a minimum of workers based on the pool configuration
     * @private
     */
    private initialize(): void {
        const { size } = this.configuration;
        for(let i = 0; i<=size; i++) {
            this.createWorker();
        }
    }

}
