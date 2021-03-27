import {
  fetchCommunities,
  updateBatches,
  fetchContract,
  fetchIDs,
  fetchContracts,
  fetchStats,
} from "./utils";
import Koa from "koa";
import cors from "@koa/cors";
import Router from "@koa/router";
import mongoose from "mongoose";

const communities = async () => {
  await fetchCommunities();
  setTimeout(communities, 600000);
};

const main = async () => {
  await updateBatches();
  setTimeout(main, 180000);
};

const cache = new Koa();
cache.use(cors());
const router = new Router();

(async () => {
  // Connect to database.
  await mongoose.connect(
    "mongodb+srv://admin:BhiEbaXXU8sTU1N6@cluster0.lln3i.mongodb.net/cache?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  );

  // Setup listener to communites.
  communities();

  // Setup batch program.
  main();

  // Setup endpoints.
  router.get("/:input", async (ctx, next) => {
    const input = ctx.params.input;

    if (/[a-z0-9_-]{43}/i.test(input)) {
      ctx.body = await fetchContract(input);
    } else if (input === "ids") {
      ctx.body = await fetchIDs();
    } else if (input === "all") {
      ctx.body = await fetchContracts();
    } else if (input === "stats") {
      ctx.body = await fetchStats();
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  // Run the app.
  cache.use(router.routes());
  cache.listen(process.env.PORT || 8080);
})();
