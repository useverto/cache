import {GcpStorageService} from "verto-internals/services/gcp/gcp-storage.service";
import {Injectable} from "@nestjs/common";

/**
 * This service interacts with the logic behind caching our contracts inside the Google CDN
 */
@Injectable()
export class GcpContractStorageService {

    static get stage() {
        return process.env["STAGE"];
    }

    static get isDevelop() {
        const isDevelop = this.stage === 'develop' || process.env["STATUS"] === 'dev';
        return isDevelop;
    }

    static get PARENT_BUCKET_NAME_STATIC() {
        return this.isDevelop ? 'verto-exchange-contracts-stage' : 'verto-exchange-contracts';
    }

    static get PARENT_ADDRESS_BUCKET_NAME_STATIC() {
        return this.isDevelop ? 'verto-exchange-contracts-addresses-stage' : 'verto-exchange-contracts-addresses';
    }

    static get S_PARENT_BUCKET_NAME() {
        return this.PARENT_BUCKET_NAME_STATIC;
    }

    static get S_PARENT_ADDRESS_BUCKET_NAME() {
        return this.PARENT_ADDRESS_BUCKET_NAME_STATIC;
    }

    get PARENT_BUCKET_NAME() {
        return GcpContractStorageService.PARENT_BUCKET_NAME_STATIC;
    }

    get PARENT_ADDRESS_BUCKET_NAME() {
        return GcpContractStorageService.PARENT_ADDRESS_BUCKET_NAME_STATIC;
    }

    static get S_IS_DEVELOP() {
        return this.isDevelop;
    }

    static get S_STAGE() {
        return this.stage;
    }

    constructor(private readonly gcpStorage: GcpStorageService) {
        console.log(`Detected Stage: ${GcpContractStorageService.stage} === Develop ? ${GcpContractStorageService.isDevelop}`);
        this.initializeParentBucket(this.PARENT_BUCKET_NAME);
        this.initializeParentBucket(this.PARENT_ADDRESS_BUCKET_NAME);
    }

    /**
     * Uploads the state of a contract to the Google CDN
     * @param contractId contract id of the state to be uploaded
     * @param state state of the contract
     * @param validityFile whether to upload the validity (in a separate file)
     */
    async uploadState(contractId: string, state: any, validityFile: boolean = false): Promise<Array<void>> {
        const options = {
            metadata: {
                ["Cache-Control"]: "no-store",
                    cacheControl: "no-store"
            }
        };
        try {
            const fileUpload = await this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                fileName: `${contractId}/${contractId}_state.json`,
                fileContent: JSON.stringify(validityFile ? state["state"] : state, null, 2),
                // @ts-ignore
                options
            });

            if (validityFile) {
                const validityUpload = await this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                    fileName: `${contractId}/${contractId}_validity.json`,
                    fileContent: JSON.stringify(state.validity, null, 2),
                    // @ts-ignore
                    options
                });
                return [fileUpload, validityUpload];
            }

            return [fileUpload];
        } catch {
            return [];
        }
    }

    /**
     * Upload all tokens skeletons for search purposes
     */
    async uploadSkeletons(skeletons: Array<any>) {
        try {
            const fileUpload = await this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                fileName: `tokens/skeletons.json`,
                fileContent: JSON.stringify(skeletons, null, 2),
                options: {
                    // @ts-ignore
                    metadata: {
                        ["Cache-Control"]: "no-store",
                        cacheControl: "no-store"
                    }
                }
            });

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

    async findAllContractsInStorage(): Promise<Array<any>> {
        const options = {
            autoPaginate: false,
            delimiter: "/"
        };

        const [files, nextQuery, apiResponse] = await this.gcpStorage
            .getBucket(this.PARENT_BUCKET_NAME)
            .getFiles(options);

        return ((apiResponse.prefixes || []) as Array<string>)
            .map(item => item.replace('/', ''))
            .map(item => ({ [item]: true }))
            .flat();
    }

    async fetchContractState(contractId: string): Promise<string> {
        return this.gcpStorage.fetchFileContent(this.PARENT_BUCKET_NAME, `${contractId}/${contractId}_state.json`);
    }

    async fetchTokenSkeleton(): Promise<string> {
        return this.gcpStorage.fetchFileContent(this.PARENT_BUCKET_NAME, `tokens/skeletons.json`);
    }

}
