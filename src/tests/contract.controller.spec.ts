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
    })
})
