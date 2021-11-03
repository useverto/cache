import {ContractController} from "../modules/contracts/contract.controller";

describe('Contract Controller test', () => {
    test('save/:id', () => {
        const spy = jest.fn();
        // @ts-ignore
        const contractController = new ContractController(undefined, {
            sendContractToWorkerPool: spy
        });

        contractController.saveContract("ABCD");
        expect(spy).toHaveBeenCalledWith("ABCD");
    });

    test('status/:id FOUND', async () => {
        const spy = jest.fn((contractId) => ({
            contractId
        }));
        // @ts-ignore
        const contractController = new ContractController(undefined, undefined, {
            getFailedContract: spy
        });

        const isFailed = await contractController.isFailed("ABCD");
        expect(spy).toHaveBeenCalledWith("ABCD");
        expect(isFailed).toStrictEqual({
            contractId: "ABCD",
            status: 'FAILED'
        });
    });

    test('status/:id NOT FOUND', async () => {
        const spy = jest.fn();
        // @ts-ignore
        const contractController = new ContractController(undefined, undefined, {
            getFailedContract: spy
        });

        const isFailed = await contractController.isFailed("ABCD");
        expect(isFailed).toStrictEqual({
            contractId: "ABCD",
            status: 'OK'
        });
    });
})
