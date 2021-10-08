import * as dotenv from "dotenv";
import {loadGlobals} from "../load-globals";
import {GcpStorage} from "./gcp-storage/gcp-storage";
import {GcpCredentials} from "./gcp-credentials/gcp-credentials";

export class ApplicationContext {

    initialize() {
        dotenv.config();
        loadGlobals();
    }

    getGcpStorage() {
        return new GcpStorage(GcpCredentials.getCredentials());
    }

}
