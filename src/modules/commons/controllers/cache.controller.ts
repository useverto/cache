import {Controller, Get} from "@nestjs/common";

@Controller()
export class CacheController {

    @Get('ping')
    public getStatus() {
        return {
            status: 'Online'
        }
    }

}
