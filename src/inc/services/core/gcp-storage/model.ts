import {FileOptions} from "@google-cloud/storage";

export interface FileSaveInfo {
    fileName: string;
    fileContent: string | Buffer;
    options?: FileOptions;
}
