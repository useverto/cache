import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {ContractModule} from "./modules/contracts/contract.module";
import {CommonModule} from "./modules/commons/common.module";


@Module({
  imports: [
      ConfigModule.forRoot(),
      CommonModule,
      ContractModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
