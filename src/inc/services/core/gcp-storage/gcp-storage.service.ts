import {Bucket, CreateBucketResponse, File, Storage} from "@google-cloud/storage";
import {CreateBucketRequest} from "@google-cloud/storage/build/src/storage";
import {Injectable} from "@nestjs/common";
import {GcpCredentials} from "../../../gcp-credentials/gcp-credentials";
import {FileSaveInfo} from "./model";
import {GetResponse} from "@google-cloud/common/build/src/service-object";

/**
 * This service interacts with the google data storage CDN.
 */
@Injectable()
export class GcpStorageService {

    private storageInstance: Storage;
    private readonly decoder: TextDecoder = new TextDecoder();

    constructor() {
        this.initializeStorage();
    }

    /**
     * Checkes whether a bucket exists in the Google CDN or not.
     * @param bucketName
     */
    async bucketExists(bucketName: string): Promise<boolean> {
        const bucketExists = await this.getBucket(bucketName).exists();
        return bucketExists[0];
    }

    /**
     * Tries to create a bucket
     * @param bucketName
     * @param metadata
     */
    async createBucket(bucketName: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse> {
        return await this.storageInstance.createBucket(bucketName, metadata);
    }

    /**
     * Creates a bucket only if it does not exist
     * @param bucketName
     * @param metadata
     */
    async createBucketIfNotExists(bucketName: string, metadata?: CreateBucketRequest): Promise<CreateBucketResponse | undefined> {
        const exists = await this.bucketExists(bucketName);
        return !exists ? this.createBucket(bucketName, metadata) : undefined;
    }

    /**
     * Uploads a file to a bucket
     * @param bucketName
     * @param fileSaveInfo
     */
    async uploadFile(bucketName: string, fileSaveInfo: FileSaveInfo, retry?: number): Promise<void> {
        try {
            const bucketExists = await this.bucketExists(bucketName);
            if (bucketExists) {
                const file = this.storageInstance.bucket(bucketName).file(fileSaveInfo.fileName);
                return file.save(fileSaveInfo.fileContent, fileSaveInfo.options);
            }
        } catch(e) {
            if(!retry || retry <= 0) {
                this.initializeStorage();
                await this.uploadFile(bucketName, fileSaveInfo, 1);
            }
            console.error(e);
        }
    }

    /**
     * Gets a file instance
     * @param bucketName
     * @param fileName
     */
    getFile(bucketName: string, fileName: string): File {
        return this.getBucket(bucketName).file(fileName);
    }

    /**
     * Fetches the content of a file
     * @param bucketName
     * @param fileName
     */
    async fetchFileContent(bucketName: string, fileName: string): Promise<string> {
        return this.decoder.decode(
            (await this.getBucket(bucketName).file(fileName).download())[0]
        );
    }

    /**
     * Fetch a response with a file
     * @param bucketName
     * @param fileName
     */
    async fetchFile(bucketName: string, fileName: string): Promise<GetResponse<File>> {
        return this.getFile(bucketName, fileName).get();
    }

    /**
     * Gets a bucket instance
     * @param bucketName
     */
    getBucket(bucketName: string): Bucket {
        return this.storageInstance.bucket(bucketName);
    }

    private initializeStorage(): void {
        const credentials = GcpCredentials.getCredentials();
        this.storageInstance = new Storage({
            projectId: credentials.project_id,
            credentials
        });
    }


}
