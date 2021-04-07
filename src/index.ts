require("dotenv").config();
import { fetchCommunities } from "./utils/communities";
import { updateOrders } from "./utils/orders";
import { updateBatches } from "./utils/batches";
import Koa from "koa";
import cors from "@koa/cors";
import Router from "@koa/router";
import mongoose from "mongoose";
import { fetchContract, fetchContracts, newContract } from "./utils/contracts";
import Order from "./models/order";
import { fetchStats } from "./utils/batches";
import { getHistorical, getPairs, getTickers } from "./utils/gecko";
import { fetchBalances, fetchOrders } from "./utils/user";
import { getCommunities } from "./utils/site";

const communities = async () => {
  await fetchCommunities();
  setTimeout(communities, 600000);
};

const orders = async () => {
  await updateOrders();
  setTimeout(orders, 600000);
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
    `mongodb+srv://admin:${process.env.PASSWORD}@cluster0.lln3i.mongodb.net/cache?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  );

  // Setup listener for communities.
  communities();

  // Setup listener for orders.
  orders();

  // Setup batch program.
  main();

  // Setup endpoints.
  router.get("/:input", async (ctx, next) => {
    const input = ctx.params.input;

    const query = ctx.request.query;
    const token = query["token"];
    const from = query["from"];
    const to = query["to"];

    if (/[a-z0-9_-]{43}/i.test(input)) {
      ctx.body = await fetchContract(input);
    } else if (input === "tokens") {
      const res = await Order.aggregate()
        .group({
          _id: null,
          token: { $addToSet: "$token" },
        })
        .unwind({
          path: "$token",
        })
        .lookup({
          from: "contracts",
          localField: "token",
          foreignField: "_id",
          as: "contract",
        })
        .unwind({ path: "$contract" })
        .project({
          token: 1,
          "contract.state.name": 1,
          "contract.state.ticker": 1,
        })
        .sort({ "contract.state.ticker": 1 });

      ctx.body = res.map((entry: any) => {
        return {
          id: entry.token,
          name: entry.contract.state.name,
          ticker: entry.contract.state.ticker,
        };
      });
    } else if (input === "all") {
      ctx.body = await fetchContracts();
    } else if (input === "orders") {
      let query = {};
      if (token) {
        query = { ...query, token };
      }
      if (from || to) {
        let timestamp = {};
        if (from) timestamp = { ...timestamp, $gte: from };
        if (to) timestamp = { ...timestamp, $lte: to };

        query = { ...query, timestamp };
      }

      const orders = await Order.find(query);
      const res = orders
        .map((order: any) => {
          return {
            id: order.id,
            status: order.status,
            sender: order.sender,
            target: order.target,
            token: order.token,
            input: `${order.input} ${order.inputUnit}`,
            output: `${order.output || "???"} ${order.outputUnit}`,
            timestamp: order.timestamp,
          };
        })
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      ctx.body = res;
    } else if (input === "stats") {
      ctx.body = await fetchStats();
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });
  router.get("/balance/:addr", async (ctx, next) => {
    const addr = ctx.params.addr;

    if (/[a-z0-9_-]{43}/i.test(addr)) {
      ctx.body = await fetchBalances(addr);
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });
  router.get("/fetch/:id", async (ctx, next) => {
    const id = ctx.params.id;

    if (/[a-z0-9_-]{43}/i.test(id)) {
      await newContract(id);
      ctx.body = "Fetched!";
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });
  router.get("/order/:id", async (ctx, next) => {
    const id = ctx.params.id;

    if (/[a-z0-9_-]{43}/i.test(id)) {
      const order = await Order.findById(id);
      if (order) {
        ctx.body = {
          id: order.id,
          status: order.status,
          sender: order.sender,
          target: order.target,
          token: order.token,
          input: `${order.input} ${order.inputUnit}`,
          output: `${order.output || "???"} ${order.outputUnit}`,
          timestamp: order.timestamp,
        };
      }
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  router.get("/user/:address/:input", async (ctx, next) => {
    const address = ctx.params.address;
    const input = ctx.params.input;

    if (/[a-z0-9_-]{43}/i.test(address)) {
      if (input === "balances") {
        ctx.body = await fetchBalances(address);
      } else if (input === "orders") {
        ctx.body = await fetchOrders(address);
      } else {
        ctx.body = "Not Found";
      }
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  router.get("/gecko/pairs", async (ctx, next) => {
    ctx.body = await getPairs();
    await next();
  });
  router.get("/gecko/tickers", async (ctx, next) => {
    ctx.body = await getTickers();
    await next();
  });
  router.get("/gecko/historical/:id", async (ctx, next) => {
    const id = ctx.params.id;
    const query = ctx.request.query;
    const limit = query["limit"];

    if (/[a-z0-9_-]{43}/i.test(id)) {
      ctx.body = await getHistorical(
        id,
        limit ? parseFloat(limit.toString()) : 0
      );
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  router.get("/site/communities/:type", async (ctx, next) => {
    const type = ctx.params.type;

    if (type === "random" || type === "top") {
      ctx.body = await getCommunities(type);
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  // Run the app.
  cache.use(router.routes());
  cache.listen(process.env.PORT || 8080);
})();
