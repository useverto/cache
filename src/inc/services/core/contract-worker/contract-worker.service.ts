import {Injectable} from "@nestjs/common";
import {WorkerPool} from "../../../worker-pool/worker-pool";
import {GcpContractStorageService} from "../gcp-contract-storage/gcp-contract-storage.service";

@Injectable()
export class ContractWorkerService {

    private workerPool: WorkerPool;

    constructor(private readonly gcpContractStorage: GcpContractStorageService) {
        this.initializeWorker();
        this.initializeBehaviors();
    }

    public sendContractToWorkerPool(contractId: string, waitForResult?: boolean, showResult?: boolean) {
        return this.workerPool.processContractInWorker(contractId, waitForResult, showResult);
    }

    private initializeWorker() {
        const autoScale = process.env["WORKER_POOL_AUTOSCALE"];
        this.workerPool = new WorkerPool({
            autoScale: autoScale === 'true' || (autoScale as any) === true,
            size: parseInt(process.env["WORKER_POOL_SIZE"]),
            contractsPerWorker: parseInt(process.env["WORKER_CONTRACTS_PER_WORKER"])
        });
    }

    private initializeBehaviors() {
        this.workerPool.setOnReceived((contractId, state) => {
            this.gcpContractStorage.uploadState(contractId, state);
        });
    }
}
