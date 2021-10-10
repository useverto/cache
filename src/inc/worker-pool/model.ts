import {PromiseContext} from "../common.model";

export interface WorkerPoolConfiguration {
    size: number;
    contractsPerWorker: number;
    autoScale: boolean;
}

export interface WorkerStats {
    workerId: number;
    contractsOnProcessing: number;
    workerScaled: boolean;
}

export interface WorkerResult extends PromiseContext {
    contractId: string;
    showResult: boolean;
}