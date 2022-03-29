import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {loadGlobals} from "./load-globals";
import { config as dotenv } from "dotenv";
import {Constants} from "./inc/constants";

loadGlobals();
dotenv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env["CORS_ORIGIN"] || '*',
    methods: process.env["CORS_METHODS"] || '*',
    maxAge: parseInt(process.env["MAX_AGE_SECONDS"]! || '0') || 3600
  })
  const port = process.env["PORT"] || process.env["port"];
  await app.listen(port ? parseInt(port) : 3000, () => {
    Constants.COMMUNITY_CONTRACT = process.env.COMMUNITY_CONTRACT ? process.env.COMMUNITY_CONTRACT : 't9T7DIOGxx4VWXoCEeYYarFYeERTpWIC1V3y-BPZgKE';
  });
}

bootstrap();
