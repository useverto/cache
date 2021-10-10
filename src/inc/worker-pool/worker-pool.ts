import {WorkerPoolConfiguration, WorkerResult, WorkerStats} from "./model";
import Worker from 'web-worker';
import path from "path";

export class WorkerPool {

    private contractsQueue: Array<string> = [];
    private workers: Array<Worker> = [];
    private stats: Array<WorkerStats> = [];
    private promises: Array<WorkerResult> = [];
    private currentContractIdsWorkedOn: Array<string> = [];

    constructor(private readonly configuration: WorkerPoolConfiguration) {
        this.initialize();
        this.setTimers();
    }

    public processContractInWorker(contractId: string, waitForResult: true): Promise<true>;
    public processContractInWorker(contractId: string, waitForResult: true, showResult: boolean): Promise<any>;
    public processContractInWorker(contractId: string): void;
    public processContractInWorker(contractId: string, waitForResult?: true, showResult?: true): void | Promise<any> {
        if(!this.currentContractIdsWorkedOn.some(item => item === contractId)) {
            const {autoScale, contractsPerWorker} = this.configuration;
            const freeWorker = this.stats.find((item) => item.contractsOnProcessing < contractsPerWorker);
            let workerToUse: number | undefined = undefined;

            if (!freeWorker) {
                if (autoScale) {
                    workerToUse = this.createWorker(true);
                } else {
                    this.contractsQueue.push(contractId);
                }
            } else {
                workerToUse = freeWorker.workerId;
            }

            if (workerToUse >= 0) {
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
        } else {
            this.contractsQueue.push(contractId);
        }

        if(waitForResult) {
            let resolver, catcher;
            let promiseWorker = new Promise((_resolve, _reject) => {
                resolver = _resolve;
                catcher = _reject;
            })
            this.promises.push({
                promise: promiseWorker,
                resolver,
                catcher,
                contractId,
                showResult
            });
            return promiseWorker;
        }
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

    private initializeBehaviors(worker: Worker, workerId: number) {

        const decreaseContractsOnProcessing = () => this.updateStats(workerId, (localStats) => {
            const contractsOnProcessing = localStats.contractsOnProcessing;
            return {
                ...localStats,
                contractsOnProcessing: contractsOnProcessing === 1 ? 0 : (contractsOnProcessing - 1)
            }
        });

        const resolvePromises = (contractId: string, state: any, isError: boolean) => {
            const result = this.promises.find((item) => item.contractId === contractId);
            if(result) {
                if (!isError) {
                    result.resolver(result.showResult ? state : true);
                } else {
                    result.catcher(false);
                }

                this.promises = this.promises.filter((item) => item.contractId !== contractId);
            }
        }

        worker.addEventListener('message', e => {
            const data = e.data;
            const type = data.type;
            const contractId = data.contractId;
            const state = data.state;

            decreaseContractsOnProcessing();
            resolvePromises(contractId, state, type === 'error');
        });

        worker.addEventListener("error", (error) => {
            console.log(error);
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
