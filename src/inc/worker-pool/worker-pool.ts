import {WorkerPoolConfiguration, WorkerProcessPostResult, WorkerResult, WorkerStats} from "./model";
import Worker from 'web-worker';
import path from "path";

export type OnReceived = (contractId: string, state: any) => void | Promise<void>;

export class WorkerPool {

    private contractsQueue: Array<string> = [];
    private workers: Array<Worker> = [];
    private stats: Array<WorkerStats> = [];
    private promises: Array<WorkerResult> = [];
    private currentContractIdsWorkedOn: Array<string> = [];

    private onReceived: OnReceived;

    constructor(private readonly configuration: WorkerPoolConfiguration) {
        this.initialize();
        this.setTimers();
    }

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

            if (workerToUse >= 0) {
                this.sendContractToWorker(contractId, workerToUse);
                returnData.state = 'CONTRACT_SENT';
            }

            if(waitForResult) {
                const promiseForResult = this.createPromiseResultContext(contractId, showResult);
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

    public setOnReceived(callback: OnReceived): void {
        this.onReceived = callback;
    }

    public getWorkers(): Array<Worker> {
        return this.workers;
    }

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

        this.workers[workerId] = this.initializeBehaviors(worker, workerId);
        this.stats.push({
            workerId,
            contractsOnProcessing: 0,
            workerScaled
        });
        return workerId;
    }

    private sendContractToWorker(contractId: string, workerToUse: number) {
        const stat = this.updateStats(workerToUse, (localStats) => {
            return {
                ...localStats,
                contractsOnProcessing: localStats.contractsOnProcessing + 1
            }
        });
        if (stat) {
            this.workers[stat.workerId].postMessage({
                contractId
            });
            this.currentContractIdsWorkedOn.push(contractId);
        }
    }

    private createPromiseResultContext(contractId: string, showResult: boolean) {
        let resolver, catcher;
        let promiseWorker = new Promise((_resolve, _reject) => {
            resolver = _resolve;
            catcher = _reject;
        })
        return {
            promise: promiseWorker,
            resolver,
            catcher,
            contractId,
            showResult
        };
    }

    private initializeBehaviors(worker: Worker, workerId: number) {

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

            if(this.onReceived && type === 'result') {
                this.onReceived(contractId, state);
            }

            resolvePromises(contractId, data, type === 'error');
        });

        worker.addEventListener("error", (error) => {
            console.log("Error in worker", error);
            decreaseContractsOnProcessing();
        });

        return worker;
    }

    private updateStats(workerId: number, processor: (stats: WorkerStats) => WorkerStats) {
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

    private setTimers(): void {
        setInterval(() => {
            this.deleteScaledWorkers();
        }, 60000);

        setInterval(() => {
            this.processQueue();
        }, 60000);
    }

    private deleteScaledWorkers(): void {
        const scaledWorkers = this.stats.filter(stat => stat.workerScaled && stat.contractsOnProcessing <= 0);
        scaledWorkers.forEach(({ workerId }) => {
            this.workers[workerId].terminate();
            this.workers.splice(workerId, 1);
        });
        this.stats = this.stats.filter(stat => !stat.workerScaled);
    }

    private processQueue(): void {
        const temporaryList = [...this.contractsQueue];
        temporaryList.forEach(
            (contractId) => {
                this.contractsQueue = this.contractsQueue.filter(item => item !== contractId);
                this.processContractInWorker(contractId);
            }
        );
    }

    private initialize() {
        const { size } = this.configuration;
        for(let i = 0; i<=size; i++) {
            this.createWorker();
        }
    }

}
