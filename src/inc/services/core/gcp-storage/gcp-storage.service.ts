import {Storage} from "@google-cloud/storage";
import {CreateBucketRequest} from "@google-cloud/storage/build/src/storage";
import {Injectable} from "@nestjs/common";
import {GcpCredentials} from "../../../gcp-credentials/gcp-credentials";

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

    async createBucket(bucketName: string, metadata?: CreateBucketRequest) {
        return await this.storageInstance.createBucket(bucketName, metadata);
    }

}
