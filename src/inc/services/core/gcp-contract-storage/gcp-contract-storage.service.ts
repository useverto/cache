import {GcpStorageService} from "../gcp-storage/gcp-storage.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class GcpContractStorageService {

    private readonly PARENT_BUCKET_NAME: string = 'verto-exchange-contracts';
    private readonly PARENT_ADDRESS_BUCKET_NAME: string = 'verto-exchange-contracts-addresses';

    constructor(private readonly gcpStorage: GcpStorageService) {
        this.initializeParentBucket(this.PARENT_BUCKET_NAME);
        this.initializeParentBucket(this.PARENT_ADDRESS_BUCKET_NAME);
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

    async uploadAddress(contractId: string, state: any) {
        const balances: Array<string> | undefined = Object.keys(state?.state?.balances);
        balances?.map(async (addressId) => {
            const addressBucket = this.PARENT_ADDRESS_BUCKET_NAME;
            const fileName = `${addressId}/${addressId}_contracts.json`
            let addressContractsPartOf = [];

            try {
                const fileContent = await this.gcpStorage.fetchFileContent(addressBucket, fileName);
                if(fileContent) {
                    addressContractsPartOf = JSON.parse(fileContent);
                }
            } catch(e) {
            }

            addressContractsPartOf.push(contractId);

            this.gcpStorage.uploadFile(addressBucket, {
                fileName,
                fileContent: JSON.stringify(addressContractsPartOf, null, 2)
            })
        });
    }

    async initializeParentBucket(bucketName: string) {
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
