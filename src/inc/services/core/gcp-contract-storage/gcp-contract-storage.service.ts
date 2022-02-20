import {GcpStorageService} from "verto-internals/services/gcp/gcp-storage.service";
import {Injectable} from "@nestjs/common";

const stage = process.env["STAGE"];
const isDevelop = stage === 'develop' || process.env["STATUS"] === 'dev';
const PARENT_BUCKET_NAME = isDevelop ? 'verto-exchange-contracts-stage' : 'verto-exchange-contracts';
const PARENT_ADDRESS_BUCKET_NAME = isDevelop ? 'verto-exchange-contracts-addresses-stage' : 'verto-exchange-contracts-addresses';


/**
 * This service interacts with the logic behind caching our contracts inside the Google CDN
 */
@Injectable()
export class GcpContractStorageService {

    private readonly PARENT_BUCKET_NAME: string = PARENT_BUCKET_NAME;
    private readonly PARENT_ADDRESS_BUCKET_NAME: string = PARENT_ADDRESS_BUCKET_NAME;
    public static readonly S_PARENT_BUCKET_NAME = PARENT_BUCKET_NAME;
    public static readonly S_PARENT_ADDRESS_BUCKET_NAME = PARENT_ADDRESS_BUCKET_NAME;
    public static readonly S_IS_DEVELOP = isDevelop;
    public static readonly S_STAGE = stage;

    constructor(private readonly gcpStorage: GcpStorageService) {
        console.log(`Detected Stage: ${stage} === Develop ? ${isDevelop}`);
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
        try {
            const fileUpload = await this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
                fileName: `${contractId}/${contractId}_state.json`,
                fileContent: JSON.stringify(validityFile ? state["state"] : state, null, 2)
            });

            if (validityFile) {
                const validityUpload = await this.gcpStorage.uploadFile(this.PARENT_BUCKET_NAME, {
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

}
