import Arweave from "arweave";
import {Injectable} from "@nestjs/common";

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

    getClient() {
        return this.client;
    }
}
