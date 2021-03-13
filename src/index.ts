import Arweave from "arweave";
import Koa from "koa";
import json from "koa-json";
import cors from "@koa/cors";
import Router from "@koa/router";
import { run } from "ar-gql";
import interactionQuery from "./queries/interaction";
import fs from "fs";
import { readContract } from "smartweave";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const cache = new Koa();
cache.use(json());
cache.use(cors());

const router = new Router();
router.get("/:contract", async (ctx, next) => {
  const contract = ctx.params.contract;

  const res = await run(interactionQuery, {
    contract,
    block: (await client.network.getInfo()).height,
  });
  const edge = res.data.transactions.edges[0];
  const latestInteraction = edge ? edge.node.id : "";

  let content: any | undefined;
  let cache: any | undefined;
  try {
    const res = fs.readFileSync("./cache.json").toString();
    content = JSON.parse(res);
    cache = content[contract];
  } catch {}

  if (cache && cache.interaction === latestInteraction) {
    ctx.body = cache.res;
  } else {
    const res = await readContract(client, contract, undefined, true);
    ctx.body = res;

    fs.writeFileSync(
      "./cache.json",
      JSON.stringify({
        ...content,
        [contract]: { interaction: latestInteraction, res },
      })
    );
  }

  await next();
});

cache.use(router.routes());
cache.listen(process.env.PORT || 8080);
