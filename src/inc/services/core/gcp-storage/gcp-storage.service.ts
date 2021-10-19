import {Bucket, CreateBucketResponse, File, Storage} from "@google-cloud/storage";
import {CreateBucketRequest} from "@google-cloud/storage/build/src/storage";
import {Injectable} from "@nestjs/common";
import {GcpCredentials} from "../../../gcp-credentials/gcp-credentials";
import {FileSaveInfo} from "./model";
import {GetResponse} from "@google-cloud/common/build/src/service-object";

@Injectable()
export class GcpStorageService {

    private readonly storageInstance: Storage;
    private readonly decoder: TextDecoder = new TextDecoder();

    constructor() {
        const credentials = GcpCredentials.getCredentials();
        this.storageInstance = new Storage({
            projectId: credentials.project_id,
            credentials
        });
    }

    async bucketExists(bucketName: string): Promise<boolean> {
        const bucketExists = await this.getBucket(bucketName).exists();
        return bucketExists[0];
    }

    async createBucket(bucketName: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse> {
        return await this.storageInstance.createBucket(bucketName, metadata);
    }

    async createBucketIfNotExists(bucketName: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse | undefined> {
        const exists = await this.bucketExists(bucketName);
        return !exists ? this.createBucket(bucketName, metadata) : undefined;
    }

    async uploadFile(bucketName: string, fileSaveInfo: FileSaveInfo): Promise<void> {
        const bucketExists = await this.bucketExists(bucketName);
        if(bucketExists) {
            const file = this.storageInstance.bucket(bucketName).file(fileSaveInfo.fileName);
            return file.save(fileSaveInfo.fileContent, fileSaveInfo.options);
        }
    }

    getFile(bucketName: string, fileName: string): File {
        return this.getBucket(bucketName).file(fileName);
    }

    async fetchFileContent(bucketName: string, fileName: string): Promise<string> {
        return this.decoder.decode(
            (await this.getBucket(bucketName).file(fileName).download())[0]
        );
    }

    async fetchFile(bucketName: string, fileName: string): Promise<GetResponse<File>> {
        return this.getFile(bucketName, fileName).get();
    }

    getBucket(bucketName: string): Bucket {
        return this.storageInstance.bucket(bucketName);
    }


}
