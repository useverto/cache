import {
    WorkerContracts,
    WorkerFeedback,
    WorkerItem,
    WorkerPoolConfiguration,
    WorkerProcessPostResult,
    WorkerResult,
    WorkerStats
} from "./model";
import Worker from 'web-worker';
import path from "path";
import {addHoursToDate} from "../../utils/commons";
import {MetricType, WorkerPoolMetrics} from "./worker-pool-metrics";

export type OnReceived = (contractId: string, state: any) => void | Promise<void>;
export type OnError = (contractId: string, exception: any) => void | Promise<void>;
export type OnFaulty = (contractId: string) => void | Promise<void>;

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
    currentContractsInWorkers: Array<WorkerContracts> = [];
    workerFeedback: Array<WorkerFeedback> = [];
    timers: Array<any> = [];

    blackListedContracts: Array<string> = [];

    private globalOnReceived: OnReceived;
    private globalOnError: OnError;
    private globalFaultyContract: OnFaulty;
    private receivers: Map<string, OnReceived> = new Map<string, OnReceived>();

    private readonly WORKER_POOL_HOURS_EXPIRATION_FEEDBACK = 1;

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

        const isContractBlackListed = this.isContractBlackListed(contractId);
        if(!this.currentContractIdsWorkedOn.some(item => item === contractId) && !isContractBlackListed) {
            const {autoScale, contractsPerWorker} = this.configuration;
            const freeWorker = this.stats.find((item) => item.contractsOnProcessing < contractsPerWorker && item.distributable);
            let workerToUse: number | undefined = undefined;

            if (!freeWorker) {
                if (autoScale) {
                    workerToUse = this.createWorker(true);
                } else {
                    this.sendContractToQueue(contractId);
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
            if(!isContractBlackListed) {
                this.sendContractToQueue(contractId);
            }
            returnData.state = isContractBlackListed ? 'BLACKLISTED' : 'CURRENTLY_PROCESSING';
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
     * Sets a callback to be applied to the execution of all the contracts fails.
     * Useful to add layers of managing error handling.
     * @param callback
     */
    public setOnError(callback: OnError): void {
        this.globalOnError = callback;
    }

    /**
     * Sets a callback to be applied when a faulty contract is found (contract which is taking too long to be processed).
     * @param callback
     */
    public setOnFaulty(callback: OnFaulty): void {
        this.globalFaultyContract = callback;
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
     * Adds a contract to the queue
     * @param contractId
     */
    public sendContractToQueue(contractId: string): void {
        this.contractsQueue.push(contractId);
    }

    /**
     * Add a timer to the timer schedule
     * @param fn
     * @param interval
     */
    public addTimer(fn: () => void | Promise<void>, interval: number) {
        this.timers.push(setInterval(() => {
            fn();
        }, interval));
    }

    /**
     * Creates a worker and initializes its behaviors
     * @param workerScaled Whether the worker was created due to scalation
     * @param distributable Whether worker accepts incoming contracts. Or contract execution should be invoked manually and not by pool.
     * @private
     */
    private createWorker(workerScaled = false, distributable = true): number {
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
            workerScaled,
            distributable
        });

        if(workerScaled) {
            WorkerPoolMetrics.addMetric(MetricType.SCALED_WORKERS, (current) => current + 1);
        }

        return workerId;
    }

    /**
     * Sends a contract to an specific worker, instead of the worker pool.
     * @param contractId
     * @param workerToUse
     */
    private sendContractToWorker(contractId: string, workerToUse: number): void {
        const isContractBlackListed = this.isContractBlackListed(contractId);
        if(isContractBlackListed) {
            return;
        }

        const stat = this.updateStats(workerToUse, (localStats) => {
            return {
                ...localStats,
                contractsOnProcessing: localStats.contractsOnProcessing + 1
            }
        });

        if (stat) {
            this.workers[stat.workerId]?.worker?.postMessage({
                contractId,
                workerToUse
            });

            const currentWorkerContractsCount = this.currentContractsInWorkers.find((item) => item.workerId === workerToUse);
            if(currentWorkerContractsCount) {
                currentWorkerContractsCount.contracts.push(contractId);
            } else {
                this.currentContractsInWorkers.push({
                    workerId: workerToUse,
                    contracts: [contractId]
                });
            }

            const currentContractFeedback = this.workerFeedback.find((item) => item.workerId === workerToUse);
            if(!currentContractFeedback) {
                this.workerFeedback.push({
                    workerId: workerToUse,
                    lastUpdated: new Date(),
                    processedContracts: []
                })
            }

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

        const cleanDedicatedWorker = (workerId: number) => {
            const index = this.stats.findIndex((item) => !item.distributable && item.workerId === workerId);
            if(index >= 0) {
                this.hardClean(workerId);
            }
        }

        worker.addEventListener('message', async e => {
            const data = e.data;
            const type = data.type;
            const contractId = data.contractId;
            const workerId = data.workerToUse;
            const exception = data.ex;
            const state = data.state;

            const feedback = this.workerFeedback.findIndex((item) => item.workerId === workerId);
            const isError = type === 'error';
            const isFeedback = type === 'feedback';

            if(isFeedback) {
                if(!(this.workerFeedback[feedback].processedContracts.some(item => contractId === item))) {
                    this.workerFeedback[feedback].currentContract = contractId;
                }
                return;
            }

            if(!isError) {
                this.workerFeedback[feedback].lastUpdated = new Date();
                this.workerFeedback[feedback].processedContracts.push(contractId);
            }

            if(this.globalOnReceived && !isError) {
                await this.globalOnReceived(contractId, state);
                console.log(`Global handler for ${contractId} has been invoked`);
            }

            if(this.receivers.has(contractId) && !isError) {
                const receiver: OnReceived = this.receivers.get(contractId)!;
                await receiver(contractId, state);
            }

            if(isError && this.globalOnError) {
                await this.globalOnError(contractId, exception);
            }

            decreaseContractsOnProcessing();
            removeContractLock(contractId);
            resolvePromises(contractId, data, isError);

            if(!isError) {
                cleanDedicatedWorker(workerId);
            }

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
        this.timers.push(setInterval(() => {
            this.deleteScaledWorkers();
        }, 60000));

        this.timers.push(setInterval(() => {
            this.processQueue();
        }, 60000));

        this.timers.push(setInterval(() => {
            this.processWorkerFeedback();
        }, (1000 * 60) * 60));

        this.timers.push(setInterval(() => {
            this.processDedicatedWorkers();
        }, (1000 * 60) * 20));
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
                    console.log(`Scaled worker #${workerItem.id} terminated`);
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

        if(this.workers.length <= 0) {
            this.initialize();
        }

        temporaryList.forEach(
            (contractId) => {
                this.contractsQueue = this.contractsQueue.filter(item => item !== contractId);
                this.processContractInWorker(contractId);
            }
        );
    }

    /**
     * Inspect the worker feedback and does re-adjustments as needed
     */
    private processWorkerFeedback(): void {
        this.workerFeedback.forEach((feedback) => {
            const isActivityExpired = this.isWorkerActivityExpired(feedback.lastUpdated);
            const isDedicated = this.isWorkerDedicated(feedback.workerId);
            const contractsOnProcessing = this.findContractsOnProcessing(feedback.workerId) || 0;
            if(isActivityExpired && !isDedicated && contractsOnProcessing > 0) {
                const faultyContract = feedback.currentContract;
                if(faultyContract) {
                    const workerToUse = this.createWorker(true, false);
                    this.sendContractToWorker(faultyContract, workerToUse);
                }
                const workerContractsInformation = this.currentContractsInWorkers.findIndex((item) => item.workerId === feedback.workerId);

                if(workerContractsInformation >= 0) {
                    const contractsToBeProcessed = [...this.currentContractsInWorkers[workerContractsInformation].contracts];
                    const contractsProcessed = [...feedback.processedContracts];
                    const unprocessedContracts = contractsToBeProcessed.filter((o) => contractsProcessed.indexOf(o) === -1)
                        .filter(item => item !== faultyContract);
                    unprocessedContracts.forEach((ctrId) => {
                        this.sendContractToQueue(ctrId);
                    });
                }

                this.hardClean(feedback.workerId, false);
            }
        });
    }

    /**
     * Executes a hard clean of an specific worker, and creates a new worker
     */
    private hardClean(workerToUse: number, isDedicated: boolean = false) {
        this.workers[workerToUse]?.worker?.terminate();
        this.currentContractsInWorkers = this.currentContractsInWorkers.filter(item => item.workerId !== workerToUse);
        this.workerFeedback = this.workerFeedback.filter(item => item.workerId !== workerToUse);
        this.stats = this.stats.filter(item => item.workerId !== workerToUse);
        this.workers = this.workers.filter(item => item.id !== workerToUse);

        if(!isDedicated) {
            this.createWorker();
        }
    }

    /**
     * Clean workers that are dedicated and have not reported anything
     */
    private processDedicatedWorkers() {
        const dedicatedWorkerIds = this.stats.filter((item) => !item.distributable)
                                             .map((item) => item.workerId);

        dedicatedWorkerIds.forEach((workerId) => {
            const feedBackIndex = this.workerFeedback.findIndex((item) => item.workerId === workerId);
            const feedback = this.workerFeedback[feedBackIndex];
            const lastUpdated = feedback.lastUpdated;
            const feedbackFaultyContract = feedback.currentContract;
            const isExpired = this.isWorkerActivityExpired(lastUpdated, 2);
            if(isExpired) {
                if(feedbackFaultyContract && this.globalFaultyContract) {
                    this.globalFaultyContract(feedbackFaultyContract);
                }
                this.hardClean(workerId, true);
            }
        });
    }

    private isWorkerDedicated(workerId: number): boolean {
        return this.stats.findIndex((item) => item.workerId === workerId && !item.distributable) >= 0;
    }

    private isWorkerActivityExpired(lastUpdated: Date, expirationHours?: number) {
        const lastActivityDate = new Date(lastUpdated);
        const expirationActivityDate = addHoursToDate(lastActivityDate, expirationHours || this.WORKER_POOL_HOURS_EXPIRATION_FEEDBACK);
        const currentDate = new Date();
        return (currentDate > expirationActivityDate);
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

    private isContractBlackListed(contractId: string) {
        return this.blackListedContracts.some((item) => item === contractId);
    }

    private findContractsOnProcessing(workerId: number): number | undefined {
        return this.stats.find((item) => item.workerId === workerId)?.contractsOnProcessing;
    }

}
