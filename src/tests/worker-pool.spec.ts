import {WorkerPool} from "../inc/worker-pool/worker-pool";

describe('Worker Pool tests', () => {

    const cleanWorkerPool = (pool: WorkerPool) => pool.workers
        .forEach(item => item.worker.terminate());

    test('Create a worker pool', () => {
       const workerPool = new WorkerPool({
           size: 2,
           contractsPerWorker: 1,
           autoScale: true
       });

       expect(workerPool.workers.length).toBe(3);
        cleanWorkerPool(workerPool);
    });

    test('Do not send contracts to workers if its processing', () => {
        const workerPool = new WorkerPool({
            size: 2,
            contractsPerWorker: 1,
            autoScale: true
        });

        workerPool.currentContractIdsWorkedOn.push("ABC");
        expect(workerPool.contractsQueue.length).toBe(0);
        const result = workerPool.processContractInWorker("ABC");
        expect(result.state).toBe("CURRENTLY_PROCESSING");
        expect(workerPool.contractsQueue.length).toBe(1);
        cleanWorkerPool(workerPool);
    });

    test('Not workers available with free scaling', () => {
        const workerPool = new WorkerPool({
            size: 2,
            contractsPerWorker: 1,
            autoScale: true
        });

        workerPool.stats = [];
        // @ts-ignore
        const spy = jest.spyOn(workerPool, 'createWorker');
        let result = workerPool.processContractInWorker("LEL");
        expect(spy).toBeCalledWith(true);
        expect(result.state).toBe("CONTRACT_SENT");

        jest.clearAllMocks();
        cleanWorkerPool(workerPool);
    });

    test('Not workers available with no scaling', () => {
        const workerPool = new WorkerPool({
            size: 2,
            contractsPerWorker: 1,
            autoScale: false
        });

        workerPool.stats = [];
        let result = workerPool.processContractInWorker("LAL");
        expect(workerPool.contractsQueue?.length).toBe(1)
        expect(result.state).toBe("ADDED_TO_QUEUE");

        jest.clearAllMocks();
        cleanWorkerPool(workerPool);
    });

    test('Send contract to worker', () => {
        const workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        let result = workerPool.processContractInWorker("LEL");
        let result2 = workerPool.processContractInWorker("LAL");
        let result3 = workerPool.processContractInWorker("LOS");
        expect(workerPool.workers.length).toBe(3);
        expect(workerPool.stats.some((item) => item.workerScaled)).toBeTruthy();
        cleanWorkerPool(workerPool);
    });

    test('Send contract to worker and have called', () => {
        const workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });
        // @ts-ignore
        const spy = jest.spyOn(workerPool, 'sendContractToWorker');
        let result = workerPool.processContractInWorker("LEL");
        let result2 = workerPool.processContractInWorker("LAL");
        let result3 = workerPool.processContractInWorker("LOS");
        expect(spy).toHaveBeenCalledTimes(3);
        expect(spy).toHaveBeenCalledWith('LEL', 0);
        expect(spy).toHaveBeenCalledWith('LAL', 1);
        expect(spy).toHaveBeenCalledWith('LOS', 2);
        cleanWorkerPool(workerPool);
    });

    test('Send contract to worker and have called with post message', () => {
        const workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        const spy = jest.spyOn(workerPool.workers[0].worker, 'postMessage');

        // @ts-ignore
        workerPool["sendContractToWorker"]("LAL", 0);

        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith({
            contractId: "LAL"
        });
        cleanWorkerPool(workerPool);
    });
});
