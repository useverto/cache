import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {ContractModule} from "./modules/contracts/contract.module";
import {CommonModule} from "./modules/commons/common.module";
import {WorkerPoolModule} from "./modules/workerpool/worker-pool.module";
import {SitesModule} from "./modules/sites/sites.module";
import {UserModule} from "./modules/users/user.module";
import {CacheController} from "./modules/commons/controllers/cache.controller";


@Module({
  imports: [
      ConfigModule.forRoot(),
      CommonModule,
      ContractModule,
      WorkerPoolModule,
      SitesModule,
      UserModule
  ],
  controllers: [
      CacheController
  ],
  providers: [],
})
export class AppModule {}
