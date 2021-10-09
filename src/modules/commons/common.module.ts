import {Module} from "@nestjs/common";
import {ArweaveClientService} from "../../inc/services/core/arweave/arweave-client.service";

@Module({
    providers: [ArweaveClientService],
    exports: [ArweaveClientService]
})
export class CommonModule {
}
