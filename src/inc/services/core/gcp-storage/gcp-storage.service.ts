import {CreateBucketResponse, Storage} from "@google-cloud/storage";
import {CreateBucketRequest} from "@google-cloud/storage/build/src/storage";
import {Injectable} from "@nestjs/common";
import {GcpCredentials} from "../../../gcp-credentials/gcp-credentials";
import {FileSaveInfo} from "./model";

@Injectable()
export class GcpStorageService {

    private readonly storageInstance: Storage;

    constructor() {
        const credentials = GcpCredentials.getCredentials();
        this.storageInstance = new Storage({
            projectId: credentials.project_id,
            credentials
        });
    }

    async bucketExists(bucketName: string) {
        const bucketExists = await this.getBucket(bucketName).exists();
        return bucketExists[0];
    }

    async createBucket(bucketName: string, metadata?: CreateBucketRequest) {
        return await this.storageInstance.createBucket(bucketName, metadata);
    }

    async createBucketIfNotExists(bucketName: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse> | undefined {
        const exists = await this.bucketExists(bucketName);
        return !exists ? this.createBucket(bucketName, metadata) : undefined;
    }

    async uploadFile(bucketName: string, fileSaveInfo: FileSaveInfo): Promise<void> {
        const bucketExists = this.bucketExists(bucketName);
        if(bucketExists) {
            const file = this.storageInstance.bucket(bucketName).file(fileSaveInfo.fileName);
            return file.save(fileSaveInfo.fileContent, fileSaveInfo.options);
        } else {
            return undefined;
        }
    }

    getBucket(bucketName: string) {
        return this.storageInstance.bucket(bucketName);
    }


}
