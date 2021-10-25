import {WorkerPool} from "../inc/worker-pool/worker-pool";

describe('Worker Pool tests', () => {
    test('Create a worker pool', () => {
       const workerPool = new WorkerPool({
           size: 2,
           contractsPerWorker: 1,
           autoScale: true
       });

       expect(workerPool.workers.length).toBe(3);
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
    });
});
