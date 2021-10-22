import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {loadGlobals} from "./load-globals";

loadGlobals();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env["CORS_ORIGIN"] || '*',
    methods: process.env["CORS_METHODS"] || '*',
    maxAge: parseInt(process.env["MAX_AGE_SECONDS"]! || '0') || 3600
  })
  const port = process.env["PORT"] || process.env["port"];
  await app.listen(port ? parseInt(port) : 3000);
}

bootstrap();
