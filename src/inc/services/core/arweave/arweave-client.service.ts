import Arweave from "arweave";
import {Injectable} from "@nestjs/common";

/**
 * This class is responsible for creating and injecting the arweave client.
 */
@Injectable()
export class ArweaveClientService {

    private readonly client: Arweave;

    constructor() {
        this.client = new Arweave({
            host: process.env["ARWEAVE_SERVER"],
            port: parseInt(process.env["ARWEAVE_PORT"]!),
            protocol: "https",
        });
    }

    /**
     * Current arweave client
     */
    getClient(): Arweave {
        return this.client;
    }
}
