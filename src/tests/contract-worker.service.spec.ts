import {ContractWorkerService} from "../inc/services/core/contract-worker/contract-worker.service";
import {WorkerPool} from "../inc/worker-pool/worker-pool";
import {clearInterval} from "timers";
import {Constants} from "../inc/constants";
import spyOn = jest.spyOn;
import {DatastoreKinds} from "../inc/services/core/gcp-datastore/model";
import {WorkerPoolMetrics} from "../inc/worker-pool/worker-pool-metrics";

describe('Contract worker service spec', () => {

    let uploadState = jest.fn();
    let saveFull = jest.fn();
    let getSingle = jest.fn();
    let createKey = jest.fn();
    let saveContract = jest.fn();
    let getAllAndClean = jest.fn(() => []);
    let deletefn = jest.fn();
    let getAll = jest.fn(() => []);
    let contractWorkerService: ContractWorkerService;

    const cleanWorkerPool = (pool: WorkerPool) => {
        WorkerPoolMetrics.cleanTimers();
        pool.workers.forEach(item => item.worker.terminate());
        pool.timers.forEach(timer => clearInterval(timer));
    }

    const resetMockUps = (data?: any) => {
        uploadState = jest.fn();
        saveFull = data?.saveFull || jest.fn();
        getSingle = data?.getSingle || jest.fn();
        createKey = data?.createKey || jest.fn();
        saveContract = jest.fn();
        getAllAndClean = jest.fn(() => []);
        deletefn = jest.fn();
        getAll = jest.fn(() => []);

        // @ts-ignore
        contractWorkerService = new ContractWorkerService({
            uploadState
        }, {
            getAll,
            saveFull,
            getSingle,
            createKey,
            delete: deletefn
        }, {
            saveContract,
            getAllAndClean
        });

        process.env["WORKER_POOL_AUTOSCALE"] = 'true';
        process.env["WORKER_POOL_SIZE"] = '15';
        process.env["WORKER_CONTRACTS_PER_WORKER"] = '10';
    }

    test('Initialize contract worker', () => {
        resetMockUps();
        expect(contractWorkerService.workerPool).not.toBeUndefined();
        //@ts-ignore
        expect(contractWorkerService.workerPool.globalOnReceived).not.toBeUndefined();
        //@ts-ignore
        expect(contractWorkerService.workerPool.receivers.get(Constants.COMMUNITY_CONTRACT)).not.toBeUndefined();

        expect(getAllAndClean).toHaveBeenCalled();
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Send contract to worker pool', () => {
        resetMockUps();
        spyOn(contractWorkerService.workerPool, 'processContractInWorker');
        contractWorkerService.sendContractToWorkerPool('A', false, false);
        expect(contractWorkerService.workerPool.processContractInWorker).toHaveBeenCalledWith('A', false, false);
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Send contract to hard worker pool', () => {
        resetMockUps();
        spyOn(contractWorkerService.workerPool, 'hardProcessContract');
        contractWorkerService.hardSendContract('A');
        expect(contractWorkerService.workerPool.hardProcessContract).toHaveBeenCalledWith('A');
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Send contract to queue', () => {
        resetMockUps();
        spyOn(contractWorkerService.workerPool, 'sendContractToQueue');
        contractWorkerService.sendContractToQueue('BCD');
        expect(contractWorkerService.workerPool.sendContractToQueue).toHaveBeenCalledWith('BCD');
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Get stats', () => {
        resetMockUps();
        contractWorkerService.workerPool.contractsQueue = ["BCD"];
        // @ts-ignore
        contractWorkerService.workerPool.stats = [{ workerScaled: true}];
        contractWorkerService.workerPool.currentContractIdsWorkedOn = ["DCD", "H"];
        expect(contractWorkerService.getStats()).toStrictEqual({
            contractsQueue: 1,
            workers: 16,
            scaledWorkers: 1,
            currentContractIdsWorkedOn: 2,
            blacklistedContracts: 0
        })
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Upload address', async () => {
        resetMockUps();
        //@ts-ignore
        await contractWorkerService.uploadAddress('__TEST__', { state: {
                balances: {
                    "X-1": 1
                }
            }
        });

        expect(createKey).toBeCalledWith(DatastoreKinds.CONTRACTS_VS_ADDRESS, `__TEST__-X-1`);
        expect(saveFull).toHaveBeenCalledWith({
            kind: DatastoreKinds.CONTRACTS_VS_ADDRESS,
            id: '__TEST__-X-1',
            data: {
                contract: '__TEST__',
                address: 'X-1'
            }
        })
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Upload address and dont save', async () => {
        resetMockUps({
            getSingle: jest.fn(() => ({}))
        });
        //@ts-ignore
        await contractWorkerService.uploadAddress('__TEST__', { state: {
                balances: {
                    "X-1": 1
                }
            }
        });

        expect(createKey).toBeCalledWith(DatastoreKinds.CONTRACTS_VS_ADDRESS, `__TEST__-X-1`);
        expect(saveFull).not.toHaveBeenCalled();
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Delete failed contracts', async () => {
        resetMockUps({
            createKey: jest.fn((kind, contractId) => ({
                kind,
                contractId
            })),
            getSingle: jest.fn((key) => ({}))
        });
        //@ts-ignore
        await contractWorkerService["deleteFromFailedContracts"]('__TEST__');

        expect(createKey).toBeCalledWith(DatastoreKinds.FAILED_CONTRACTS, `__TEST__`);
        expect(getSingle).toHaveBeenCalledWith({
            kind: DatastoreKinds.FAILED_CONTRACTS,
            contractId: '__TEST__'
        });
        expect(deletefn).toHaveBeenCalled();
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('Delete failed contracts dont delete', async () => {
        resetMockUps({
            createKey: jest.fn((kind, contractId) => ({
                kind,
                contractId
            }))
        });
        //@ts-ignore
        await contractWorkerService["deleteFromFailedContracts"]('__TEST__');
        expect(deletefn).not.toHaveBeenCalled();
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('handleErrorContract', async () => {
        resetMockUps();
        // @ts-ignore
        await contractWorkerService["handleErrorContract"]('__TEST__');
        expect(saveFull).toHaveBeenCalledWith({
            kind: DatastoreKinds.FAILED_CONTRACTS,
            id: '__TEST__',
            data: {
                contractId: '__TEST__'
            }
        });
        cleanWorkerPool(contractWorkerService.workerPool);
    })

    test('Process community contract tokens', async () => {
        resetMockUps();
        //@ts-ignore
        await contractWorkerService.processCommunityContract(null, {
            state: {
                tokens: [
                    {
                        id: 'ABCD',
                        type: 'art',
                        lister: 'ap'
                    }
                ],
                people: [
                    {
                        username: 'ap',
                        addresses: ['A', 'B']
                    }
                ],
            }
        });

        expect(saveFull).toHaveBeenCalledWith({
            kind: DatastoreKinds.COMMUNITY_TOKENS,
            id: 'ABCD',
            data: {
                contractId: 'ABCD',
                type: 'art',
                lister: 'ap'
            }
        });

        expect(saveFull).toHaveBeenLastCalledWith({
            kind: DatastoreKinds.COMMUNITY_PEOPLE,
            id: 'ap',
            data: {
                username: 'ap',
                addresses: 'A,B'
            }
        });
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('On contract receive', async () => {
        resetMockUps({
            getSingle: jest.fn(() => ({}))
        });
        const state = { state: {
                balances: {
                    "X-1": 1
                },
                ticker: "A",
                title: "Test A"
            }
        };
        //@ts-ignore
        spyOn(contractWorkerService, 'uploadAddress');
        //@ts-ignore
        await contractWorkerService.processOnReceive('__TEST__', state);

        expect(uploadState).toHaveBeenCalledWith('__TEST__', state, true);
        // @ts-ignore
        expect(contractWorkerService.uploadAddress).toHaveBeenCalled();

        expect(saveFull).toHaveBeenCalledWith(expect.objectContaining({
            kind: DatastoreKinds.CONTRACTS,
            id: '__TEST__',
            data: expect.objectContaining({
                contractId: '__TEST__',
                ticker: 'A',
                title: 'Test A'
            })
        }));
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('On contract faulty', async () => {
        resetMockUps();

        // @ts-ignore
        await contractWorkerService.handleFaultyContract('ABCD');
        expect(saveFull).toHaveBeenCalledWith({
            kind: DatastoreKinds.BLACKLISTED_CONTRACTS,
            id: 'ABCD',
            data: {
                contractId: 'ABCD'
            }
        });
        cleanWorkerPool(contractWorkerService.workerPool);
    });

    test('5 timers', () => {
        resetMockUps();
        expect(contractWorkerService.workerPool.timers.length).toBe(5);
        cleanWorkerPool(contractWorkerService.workerPool);
    })

    afterAll(() => {
        cleanWorkerPool(contractWorkerService.workerPool);
    });

})
