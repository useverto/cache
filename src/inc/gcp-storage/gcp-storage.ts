import {GcpCredentialsProvider} from "../gcp-credentials/models";
import {Storage} from "@google-cloud/storage";
import {CreateBucketRequest} from "@google-cloud/storage/build/src/storage";

export class GcpStorage {

    private readonly storageInstance: Storage;

    public static instance: GcpStorage;

    constructor(credentials: GcpCredentialsProvider) {
        this.storageInstance = new Storage({
            projectId: credentials.project_id,
            credentials
        });
    }

    async createBucket(bucketName: string, metadata?: CreateBucketRequest) {
        return await this.storageInstance.createBucket(bucketName, metadata);
    }

    static getInstance(credentials: GcpCredentialsProvider) {
        return !GcpStorage.instance ? new GcpStorage(credentials) : GcpStorage.instance;
    }

}
