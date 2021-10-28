import {ContractWorkerService} from "../inc/services/core/contract-worker/contract-worker.service";
import {WorkerPool} from "../inc/worker-pool/worker-pool";
import {clearInterval} from "timers";
import {Constants} from "../inc/constants";

describe('Contract worker service spec', () => {

    const cleanWorkerPool = (pool: WorkerPool) => {
        pool.workers.forEach(item => item.worker.terminate());
        pool.timers.forEach(timer => clearInterval(timer));
    }

    test('Initialize contract worker', () => {
        const uploadState = jest.fn();
        const saveFull = jest.fn();
        const getSingle = jest.fn();
        const createKey = jest.fn();
        const saveContract = jest.fn();
        const getAllAndClean = jest.fn(() => []);

        process.env["WORKER_POOL_AUTOSCALE"] = 'true';
        process.env["WORKER_POOL_SIZE"] = '15';
        process.env["WORKER_CONTRACTS_PER_WORKER"] = '10';

        // @ts-ignore
        const contractWorkerService = new ContractWorkerService({
            uploadState
        }, {
            saveFull,
            getSingle,
            createKey
        }, {
            saveContract,
            getAllAndClean
        });

        expect(contractWorkerService.workerPool).not.toBeUndefined();
        expect(contractWorkerService.getStats()).toStrictEqual({
            contractsQueue: 0,
            workers: 16,
            scaledWorkers: 0,
            currentContractIdsWorkedOn: 0
        });
        //@ts-ignore
        expect(contractWorkerService.workerPool.globalOnReceived).not.toBeUndefined();
        //@ts-ignore
        expect(contractWorkerService.workerPool.receivers.get(Constants.COMMUNITY_CONTRACT)).not.toBeUndefined();

        expect(getAllAndClean).toHaveBeenCalled();
        cleanWorkerPool(contractWorkerService.workerPool);

    });
})
