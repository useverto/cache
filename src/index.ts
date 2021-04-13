require("dotenv").config();
import { fetchCommunities } from "./utils/communities";
import { fetchPosts } from "./utils/posts";
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
import { getHistory, getOrders, getPrice } from "./utils/token";
import Post from "./models/post";

const communities = async () => {
  await fetchCommunities();
  setTimeout(communities, 600000);
};

const posts = async () => {
  await fetchPosts();
  setTimeout(posts, 600000);
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

  // Setup listener for posts.
  posts();

  // Setup listener for orders.
  orders();

  // Setup batch program.
  main();

  // Setup endpoints.
  router.get("/:input", async (ctx, next) => {
    const input = ctx.params.input;

    const query = ctx.request.query;
    const target = query["post"];

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
  router.get("/posts/:input*", async (ctx, next) => {
    let address;
    let input;

    const query = ctx.params.input;
    if (query) {
      address = query.split("/")[0];

      try {
        input = query.split("/")[1];
      } catch {}
    }

    if (address) {
      if (/[a-z0-9_-]{43}/i.test(address)) {
        if (input) {
          if (input === "orders") {
            const params = ctx.request.query;
            const limit = parseFloat(params["limit"] as string);
            const after = params["after"];

            let query: any = { target: address };
            if (after) {
              const order = await Order.findById(after, "timestamp");
              if (order) {
                query = {
                  ...query,
                  timestamp: { $lte: order.timestamp },
                };
              }
            }

            let orders = await Order.find(query, undefined, { limit });

            if (after) {
              const index = orders.findIndex(
                (order: any) => order.id === after
              );
              orders = orders.slice(index + 1);
            }

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
                  actions: order.actions.sort(
                    (a: any, b: any) => a.timestamp - b.timestamp
                  ),
                };
              })
              .sort((a: any, b: any) => b.timestamp - a.timestamp);

            ctx.body = res;
          } else {
            ctx.body = "Not Found";
          }
        } else {
          // Return info for specific trading post.
          const res = await Post.findById(address);

          ctx.body = {
            address: res._id,
            balance: res.balance,
            stake: res.stake,
            endpoint: res.endpoint,
          };
        }
      } else {
        ctx.body = "Not Found";
      }
    } else {
      // Return info on all trading posts.
      const res = await Post.find({ stake: { $gt: 0 } });

      ctx.body = res.map((entry: any) => ({
        address: entry._id,
        balance: entry.balance,
        stake: entry.stake,
        endpoint: entry.endpoint,
      }));
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
          actions: order.actions.sort(
            (a: any, b: any) => a.timestamp - b.timestamp
          ),
        };
      }
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  router.get("/token/:id/:input", async (ctx, next) => {
    const id = ctx.params.id;
    const input = ctx.params.input;

    if (/[a-z0-9_-]{43}/i.test(id)) {
      if (input === "orders") {
        ctx.body = await getOrders(id);
      } else if (input === "price") {
        ctx.body = await getPrice(id);
      } else if (input === "history") {
        ctx.body = await getHistory(id);
      } else {
        ctx.body = "Not Found";
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
