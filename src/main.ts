import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {loadGlobals} from "./load-globals";

loadGlobals();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env["PORT"] || process.env["port"];
  await app.listen(port ? parseInt(port) : 3000);
}

bootstrap();
