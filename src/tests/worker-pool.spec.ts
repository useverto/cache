import {WorkerPool} from "../inc/worker-pool/worker-pool";
import {clearInterval} from "timers";
import {ExceptionHandlerService} from "../inc/services/core/handlers/exception-handler";
import {addHoursToDate} from "../utils/commons";

//@ts-ignore
const setProperty = (object, property, value) => {
    const originalProperty = Object.getOwnPropertyDescriptor(object, property)
    Object.defineProperty(object, property, { value })
    return originalProperty
}

describe('Worker Pool tests', () => {

    const cleanWorkerPool = (pool: WorkerPool) => {
        pool.workers.forEach(item => item.worker.terminate());
        pool.timers.forEach(timer => clearInterval(timer));
    }

    let workerPool: WorkerPool;

    test('Create a worker pool', () => {
        workerPool = new WorkerPool({
           size: 2,
           contractsPerWorker: 1,
           autoScale: true
       });

       expect(workerPool.workers.length).toBe(3);
        cleanWorkerPool(workerPool);
    });

    test('Do not send contracts to workers if its processing', () => {
        workerPool = new WorkerPool({
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
        workerPool = new WorkerPool({
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
        workerPool = new WorkerPool({
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
        workerPool = new WorkerPool({
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
        workerPool = new WorkerPool({
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
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        const spy = jest.spyOn(workerPool.workers[0].worker, 'postMessage');

        // @ts-ignore
        workerPool["sendContractToWorker"]("LAL", 0);

        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith({
            contractId: "LAL",
            workerToUse: 0
        });
        cleanWorkerPool(workerPool);
    });

    test('Retry contract if google exception', () => {
        const spy = jest.fn();
        // @ts-ignore
        const workerPoolExceptionHandler = new ExceptionHandlerService({
            sendContractToQueue: spy,
            exitContractWorkerPoolSafely: jest.fn(() => [])
        });

        // @ts-ignore
        process.emit('uncaughtException', {
            config: {
                url: 'https://storage.googleapis.com/upload/storage/v1/b/verto-exchange-contracts/o?name=f1zRTRGpUfzrOvLislzXaPuKLyByu7_M5kGlfe_1XYQ%2Ff1zRTRGpUfzrOvLislzXaPuKLyByu7_M5kGlfe_1XYQ_validity.json&uploadType=resumable'
            }
        });

        expect(spy).toHaveBeenCalledWith('f1zRTRGpUfzrOvLislzXaPuKLyByu7_M5kGlfe_1XYQ');
    });

    test('Call contract recovery if process dies', async () => {
        const mockExit = jest.fn()
        setProperty(process, 'exit', mockExit);
        const spy = jest.fn(() => []);

        // @ts-ignore
        global["uncaughtException-PROMISE"] = new Promise((resolve) => {
            // @ts-ignore
            global["uncaughtException-RESOLVE"] = resolve;
        })

        // @ts-ignore
        const workerPoolExceptionHandler = new ExceptionHandlerService({
            exitContractWorkerPoolSafely: spy,
        });

        // @ts-ignore
        process.emit('uncaughtException', {
        });

        //@ts-ignore
        await global["uncaughtException-PROMISE"];

        expect(spy).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('processWorkerFeedback', async () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });
        workerPool.stats = [
            {
                workerId: 0,
                contractsOnProcessing: 1,
                workerScaled: true,
                distributable: false
            }
        ]
        workerPool.currentContractsInWorkers = [
            {
                workerId: 0,
                contracts: ["ABCD", "DEFG"]
            }
        ];
        workerPool.workerFeedback = [{
            workerId: 0,
            lastUpdated: new Date(),
            currentContract: 'ABCD',
            processedContracts: []
        }];
        // @ts-ignore
        jest.spyOn(workerPool, 'createWorker');
        // @ts-ignore
        jest.spyOn(workerPool, 'sendContractToWorker');
        // @ts-ignore
        jest.spyOn(workerPool, 'sendContractToQueue');
        // @ts-ignore
        jest.spyOn(workerPool, 'hardClean');

        // @ts-ignore
        workerPool.processWorkerFeedback();

        // @ts-ignore
        expect(workerPool.createWorker).not.toHaveBeenCalled();
        // @ts-ignore
        expect(workerPool.sendContractToWorker).not.toHaveBeenCalled();
        expect(workerPool.sendContractToQueue).not.toHaveBeenCalled();
        // @ts-ignore
        expect(workerPool.hardClean).not.toHaveBeenCalled();

        cleanWorkerPool(workerPool);
    });

    test('processWorkerFeedback expired contract', async () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });
        workerPool.stats = [
            {
                workerId: 0,
                contractsOnProcessing: 1,
                workerScaled: true,
                distributable: true
            }
        ]
        workerPool.currentContractsInWorkers = [
            {
                workerId: 0,
                contracts: ["ABCD", "DEFG"]
            }
        ];
        workerPool.workerFeedback = [{
            workerId: 0,
            lastUpdated: addHoursToDate(new Date(), -1.5),
            currentContract: 'ABCD',
            processedContracts: []
        }];
        // @ts-ignore
        const createWorker = jest.spyOn(workerPool, 'createWorker').mockImplementation(() => 5);
        // @ts-ignore
        jest.spyOn(workerPool, 'sendContractToWorker');
        // @ts-ignore
        jest.spyOn(workerPool, 'sendContractToQueue');
        // @ts-ignore
        jest.spyOn(workerPool, 'hardClean');

        // @ts-ignore
        workerPool.processWorkerFeedback();

        // @ts-ignore
        expect(createWorker).toHaveBeenCalledWith(true, false);
        // @ts-ignore
        expect(workerPool.sendContractToWorker).toHaveBeenCalledWith("ABCD", 5);

        // @ts-ignore
        expect(workerPool.sendContractToQueue).toHaveBeenCalledWith('DEFG');
        // @ts-ignore
        expect(workerPool.sendContractToQueue).toHaveBeenCalledTimes(1);

        // @ts-ignore
        expect(workerPool.hardClean).toHaveBeenCalledWith(0, false);

        cleanWorkerPool(workerPool);
    });

    test('processDedicatedWorkers', () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        workerPool.stats = [{
            workerId: 2,
            workerScaled: true,
            distributable: true,
            contractsOnProcessing: 1
        }];
        workerPool.workerFeedback = [{
            workerId: 2,
            lastUpdated: addHoursToDate(new Date(), -1),
            currentContract: 'ABCD',
            processedContracts: []
        }]
        workerPool.setOnFaulty(jest.fn());
        // @ts-ignore
        jest.spyOn(workerPool, 'hardClean');

        // @ts-ignore
        workerPool.processDedicatedWorkers();
        // @ts-ignore
        expect(workerPool.globalFaultyContract).not.toHaveBeenCalledWith('ABCD');
        // @ts-ignore
        expect(workerPool.hardClean).not.toHaveBeenCalled();
        cleanWorkerPool(workerPool);
    });

    test('processDedicatedWorkers expired dedicated workers', () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        workerPool.stats = [{
            workerId: 2,
            workerScaled: true,
            distributable: false,
            contractsOnProcessing: 1
        }];
        workerPool.workerFeedback = [{
            workerId: 2,
            lastUpdated: addHoursToDate(new Date(), -2.1),
            currentContract: 'ABCD',
            processedContracts: []
        }]
        workerPool.setOnFaulty(jest.fn());
        // @ts-ignore
        jest.spyOn(workerPool, 'hardClean');

        // @ts-ignore
        workerPool.processDedicatedWorkers();
        // @ts-ignore
        expect(workerPool.globalFaultyContract).toHaveBeenCalledWith('ABCD');
        // @ts-ignore
        expect(workerPool.hardClean).toHaveBeenCalled();
        cleanWorkerPool(workerPool);
    });

    test('is contract blacklisted', () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });
        workerPool.blackListedContracts = ["DFG"];
        // @ts-ignore
        expect(workerPool.isContractBlackListed("DFG")).toBeTruthy();
        // @ts-ignore
        expect(workerPool.isContractBlackListed("ABCD")).toBeFalsy();
        cleanWorkerPool(workerPool);
    });

    test('Send contract to worker blacklisted', () => {
        workerPool = new WorkerPool({
            size: 1,
            contractsPerWorker: 1,
            autoScale: true
        });

        workerPool.blackListedContracts = ["JP"]

        // @ts-ignore
        jest.spyOn(workerPool, 'sendContractToQueue');

        let result = workerPool.processContractInWorker("JP");
        expect(result.state).toBe("BLACKLISTED");
        expect(workerPool.sendContractToQueue).not.toHaveBeenCalled();
        cleanWorkerPool(workerPool);
    });

    afterAll(() => {
        cleanWorkerPool(workerPool);
    })
});
