import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {loadGlobals} from "./load-globals";

loadGlobals();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
