import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {ContractModule} from "./modules/contracts/contract.module";
import {CommonModule} from "./modules/commons/common.module";
import {WorkerPoolModule} from "./modules/workerpool/worker-pool.module";


@Module({
  imports: [
      ConfigModule.forRoot(),
      CommonModule,
      ContractModule,
      WorkerPoolModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
