import {Controller, Get} from "@nestjs/common";

@Controller()
export class CacheController {

    @Get('ping')
    public getStatus() {
        return {
            status: 'Online',
            revision: process.env["K_REVISION"],
            port: process.env["PORT"]
        }
    }

}
