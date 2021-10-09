import {WorkerPoolConfiguration, WorkerResult, WorkerStats} from "./model";
import Worker from 'web-worker';
import path from "path";

export class WorkerPool {

    private contractsQueue: Array<string> = [];
    private workers: Array<Worker> = [];
    private stats: Array<WorkerStats> = [];
    private promises: Array<WorkerResult> = [];

    constructor(private readonly configuration: WorkerPoolConfiguration) {
        this.initialize();
    }

    public processContractInWorker(contractId: string, waitForResult: boolean): Promise<any>;
    public processContractInWorker(contractId: string): void;
    public processContractInWorker(contractId: string, waitForResult?: boolean): void | Promise<any> {
        const { autoScale, contractsPerWorker } = this.configuration;
        const freeWorker = this.stats.find((item) => item.contractsOnProcessing < contractsPerWorker);
        let workerToUse: number | undefined = undefined;

        if(!freeWorker) {
            if(autoScale) {
                workerToUse = this.createWorker();
            } else {
                this.contractsQueue.push(contractId);
            }
        } else {
            workerToUse = freeWorker.workerId;
        }

        if(workerToUse) {
            const stat = this.updateStats(workerToUse, (localStats) => {
                return {
                    ...localStats,
                    contractsOnProcessing: localStats.contractsOnProcessing + 1
                }
            });
            if(stat) {
                this.workers[stat.workerId].postMessage({
                    contractId
                });

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
                        contractId
                    });
                    return promiseWorker;
                }
            }
        }
    }

    public getWorkers(): Array<Worker> {
        return this.workers;
    }

    private createWorker(): number {
        const worker = new Worker(
            path.join(__dirname, "./worker-scripts/worker-contract-execution.js"),
            {
                type: 'module'
            }
        );

        // @ts-ignore
        const workerId = this.workers.push(undefined);

        this.workers[workerId] = this.initializeBehaviors(worker, workerId);
        this.stats.push({
            workerId,
            contractsOnProcessing: 0
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

        const resolvePromises = (contractId: string, isError: boolean) => {
            const result = this.promises.find((item) => item.contractId === contractId);
            if(result) {
                if (!isError) {
                    result.resolver(true);
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
            resolvePromises(contractId, type === 'error');
        });

        worker.addEventListener("error", (error) => {
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

    private initialize() {
        const { size } = this.configuration;
        for(let i = 0; i<=size; i++) {
            this.createWorker();
        }
    }

}
