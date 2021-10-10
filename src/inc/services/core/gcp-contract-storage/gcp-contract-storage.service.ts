import {GcpStorageService} from "../gcp-storage/gcp-storage.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class GcpContractStorageService {

    private readonly PARENT_BUCKET_NAME: string = 'verto-exchange-contracts';

    constructor(private readonly gcpStorage: GcpStorageService) {
        this.gcpStorage.createBucketIfNotExists(this.PARENT_BUCKET_NAME);
    }

    async uploadState(contractId: string, state: any) {
        return this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
            fileName: `${contractId}/${contractId}_state.json`,
            fileContent: JSON.stringify(state, null, 2)
        });
    }

}
