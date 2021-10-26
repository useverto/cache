import {GcpStorageService} from "../gcp-storage/gcp-storage.service";
import {Injectable} from "@nestjs/common";

/**
 * This service interacts with the logic behind caching our contracts inside the Google CDN
 */
@Injectable()
export class GcpContractStorageService {

    private readonly PARENT_BUCKET_NAME: string = 'verto-exchange-contracts';
    private readonly PARENT_ADDRESS_BUCKET_NAME: string = 'verto-exchange-contracts-addresses';

    constructor(private readonly gcpStorage: GcpStorageService) {
        this.initializeParentBucket(this.PARENT_BUCKET_NAME);
        this.initializeParentBucket(this.PARENT_ADDRESS_BUCKET_NAME);
    }

    /**
     * Uploads the state of a contract to the Google CDN
     * @param contractId contract id of the state to be uploaded
     * @param state state of the contract
     * @param validityFile whether to upload the validity (in a separate file)
     */
    async uploadState(contractId: string, state: any, validityFile: boolean = false): Promise<Promise<void>[]> {
        try {
            const fileUpload = this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                fileName: `${contractId}/${contractId}_state.json`,
                fileContent: JSON.stringify(validityFile ? state["state"] : state, null, 2)
            });

            if (validityFile) {
                const validityUpload = this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                    fileName: `${contractId}/${contractId}_validity.json`,
                    fileContent: JSON.stringify(state.validity, null, 2)
                });
                return [fileUpload, validityUpload];
            }

            return [fileUpload];
        } catch {
            return [];
        }
    }

    /**
     * Creates the parent bucket where contracts are stored and sets a CORS configuration of public
     */
    async initializeParentBucket(bucketName: string): Promise<void> {
        await this.gcpStorage.createBucketIfNotExists(bucketName);
        await this.gcpStorage.getBucket(bucketName).setCorsConfiguration([
            {
                "origin": [
                    "*"
                ],
                "method": [
                    "*"
                ],
                "responseHeader": [
                    "*"
                ],
                "maxAgeSeconds": 3600
            }
        ]);
    }

}
