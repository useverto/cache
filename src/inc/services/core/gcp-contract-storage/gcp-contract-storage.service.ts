import {GcpStorageService} from "../gcp-storage/gcp-storage.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class GcpContractStorageService {

    private readonly PARENT_BUCKET_NAME: string = 'verto-exchange-contracts';

    constructor(private readonly gcpStorage: GcpStorageService) {
        this.gcpStorage.createBucketIfNotExists(this.PARENT_BUCKET_NAME);
    }

    async uploadState(contractId: string, state: any, validityFile: boolean = false) {
        const fileUpload = this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
            fileName: `${contractId}/${contractId}_state.json`,
            fileContent: JSON.stringify(validityFile ? state["state"] : state, null, 2)
        });

        if(validityFile) {
            const validityUpload = this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                fileName: `${contractId}/${contractId}_validity.json`,
                fileContent: JSON.stringify(state.validity, null, 2)
            });
            return [fileUpload, validityUpload];
        }

        return [fileUpload];
    }

}
