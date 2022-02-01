import {Injectable} from "@nestjs/common";
import {ContractWorkerService} from "../contract-worker/contract-worker.service";
import {MetricType, WorkerPoolMetrics} from "../../../worker-pool/worker-pool-metrics";
import {GcpDatastoreService} from "verto-internals/services/gcp";
import {GcpContractStorageService} from "../gcp-contract-storage/gcp-contract-storage.service";

@Injectable()
export class ExceptionHandlerService {

    constructor(private readonly contractWorkerService: ContractWorkerService,
                private readonly gcpDatastoreService: GcpDatastoreService) {
        this.setHandler();
    }

    private setHandler() {
        process.on('uncaughtException', async (err) => {
            const isTest = process.env.JEST_WORKER_ID;
            const stack = err.stack;
            const error: any = err;
            const requestUrl = error?.config?.url || '';
            console.error(err);
            if(!(requestUrl.includes(`https://storage.googleapis.com/upload/storage/v1/b/${GcpContractStorageService.S_PARENT_BUCKET_NAME}`))) {
                WorkerPoolMetrics.addMetric(MetricType.FAILURES, (current) => current + 1);
                await WorkerPoolMetrics.processAll(this.gcpDatastoreService);
                await Promise.allSettled(this.contractWorkerService.exitContractWorkerPoolSafely());
                process.exit(1);
                if(isTest) {
                    // @ts-ignore
                    await global["uncaughtException-RESOLVE"]();
                }
            } else {
                if(requestUrl !== '') {
                    this.retryContractIfException(requestUrl);
                }
            }
        });
    }

    public retryContractIfException(url: string) {
        const parseUrl = new URL(url);
        const params = [...parseUrl.searchParams].flat();
        const nameIndex = params.findIndex((item) => item === 'name');
        if(nameIndex >= 0) {
            const contractRoute = params[nameIndex + 1];
            const contract = contractRoute.split('/')[0];
            console.log(`Retrying contract ${contract}`);
            this.contractWorkerService.sendContractToQueue(contract);
        }
    }

}
