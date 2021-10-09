import {PromiseContext} from "../common.model";

export interface WorkerPoolConfiguration {
    size: number;
    contractsPerWorker: number;
    autoScale: boolean;
}

export interface WorkerStats {
    workerId: number;
    contractsOnProcessing: number;
}

export interface WorkerResult extends PromiseContext {
    contractId: string;
}
