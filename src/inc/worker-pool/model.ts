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
    distributable: boolean;
}

export interface WorkerItem {
    worker: Worker;
    id: number;
}

export interface WorkerResult extends PromiseContext {
    contractId: string;
    showResult: boolean;
}

export interface WorkerProcessPostResult {
    state: 'CURRENTLY_PROCESSING' | 'ADDED_TO_QUEUE' | 'CONTRACT_SENT';
    data?: any;
}

export interface WorkerContracts {
    workerId: number;
    contracts: Array<string>;
}

export interface WorkerFeedback {
    workerId: number;
    lastUpdated: Date;
    currentContract?: string;
    processedContracts: Array<string>;
}
