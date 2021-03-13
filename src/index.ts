import Koa from "koa";
import json from "koa-json";
import cors from "@koa/cors";
import Router from "@koa/router";
import { fetchCache, fetchCommunities, cacheCommunities } from "./utils";

const cache = new Koa();
cache.use(json());
cache.use(cors());

const router = new Router();
router.get("/:input", async (ctx, next) => {
  const input = ctx.params.input;

  if (/[a-z0-9_-]{43}/i.test(input)) {
    ctx.body = await fetchCache(input);
  } else if (input === "communities") {
    ctx.body = await fetchCommunities();
  } else {
    ctx.body = "Not Found";
  }

  await next();
});

cache.use(router.routes());
cache.listen(process.env.PORT || 8080);

setInterval(cacheCommunities, 600000);
