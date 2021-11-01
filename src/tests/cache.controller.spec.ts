import {CacheController} from "../modules/commons/controllers/cache.controller";

describe('Cache Controller', () => {

    test('Ping', () => {
        // @ts-ignore
        const cacheController = new CacheController({
            // @ts-ignore
            getStats: () => ({
                contractsQueue: 1,
                workers: 1,
                scaledWorkers: 1,
                currentContractIdsWorkedOn: 1
            })
        })

        process.env["REV"] = "fake-revision";
        process.env["PORT"] = "8080";

        expect(cacheController.getStatus()).toStrictEqual({
            status: 'Online',
            revision: 'fake-revision',
            port: '8080',
            workerPool: {
                contractsQueue: 1,
                workers: 1,
                scaledWorkers: 1,
                currentContractIdsWorkedOn: 1
            }
        })
    })

})
