require("dotenv").config();
import { fetchCommunities } from "./utils/communities";
import { fetchPosts } from "./utils/posts";
import { updateOrders } from "./utils/orders";
import { updateBatches } from "./utils/batches";
import Koa from "koa";
import body from "koa-body";
import cors from "@koa/cors";
import Router from "@koa/router";
import mongoose from "mongoose";
import { fetchContract, fetchContracts, newContract } from "./utils/contracts";
import Order from "./models/order";
import { fetchStats } from "./utils/batches";
import { getHistorical, getPairs, getTickers } from "./utils/gecko";
import { fetchBalances, fetchOrders } from "./utils/user";
import { getCommunities, getRandomArts } from "./utils/site";
import {
  getOrders,
  getPrice,
  getPriceHistory,
  getVolume,
  getVolumeHistory,
} from "./utils/token";
import Post from "./models/post";
import Contract from "./models/contract";

import { handleNotification } from "./utils/notifications";

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
cache.use(body());
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
    const filter = query["filter"];

    if (/[a-z0-9_-]{43}/i.test(input)) {
      ctx.body = await fetchContract(input, filter && filter.toString());
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

            let orders = await Order.find(query, undefined, { limit }).sort({
              timestamp: -1,
            });

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
          } else if (input === "stats") {
            const data = await Order.aggregate()
              .match({ target: address })
              .group({
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: {
                      $toDate: {
                        $multiply: [1000, "$timestamp"],
                      },
                    },
                  },
                },
                orders: {
                  $push: {
                    status: "$status",
                  },
                },
              })
              .sort({ _id: -1 })
              .project({
                pending: {
                  $size: {
                    $ifNull: [
                      {
                        $filter: {
                          input: "$orders",
                          as: "order",
                          cond: { $eq: ["$$order.status", "pending"] },
                        },
                      },
                      [],
                    ],
                  },
                },
                succeeded: {
                  $size: {
                    $ifNull: [
                      {
                        $filter: {
                          input: "$orders",
                          as: "order",
                          cond: { $eq: ["$$order.status", "success"] },
                        },
                      },
                      [],
                    ],
                  },
                },
                neutral: {
                  $size: {
                    $ifNull: [
                      {
                        $filter: {
                          input: "$orders",
                          as: "order",
                          cond: { $eq: ["$$order.status", "cancelled"] },
                        },
                      },
                      [],
                    ],
                  },
                },
                errored: {
                  $size: {
                    $ifNull: [
                      {
                        $filter: {
                          input: "$orders",
                          as: "order",
                          cond: {
                            $or: [
                              { $eq: ["$$order.status", "refunded"] },
                              { $eq: ["$$order.status", "returned"] },
                            ],
                          },
                        },
                      },
                      [],
                    ],
                  },
                },
              });

            let res: any = {};
            for (const item of data) {
              res[item._id] = {
                pending: item.pending,
                succeeded: item.succeeded,
                neutral: item.neutral,
                errored: item.errored,
              };
            }

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
            time: res.time,
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
        time: entry.time,
        endpoint: entry.endpoint,
      }));
    }

    await next();
  });

  router.get("/latest-activity", async (ctx, next) => {
    const allOrders = await Order.aggregate().limit(4);
    const formatedOrders = [];

    for (const order of allOrders)
      formatedOrders.push({
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
      });

    ctx.body = formatedOrders;

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
      } else if (input === "priceHistory") {
        ctx.body = await getPriceHistory(id);
      } else if (input === "volume") {
        ctx.body = await getVolume(id);
      } else if (input === "volumeHistory") {
        ctx.body = await getVolumeHistory(id);
      } else {
        ctx.body = "Not Found";
      }
    } else {
      ctx.body = "Not Found";
    }

    await next();
  });

  router.get("/users", async (ctx, next) => {
    const people = await Contract.aggregate()
      .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
      .unwind({ path: "$state.people" })
      .addFields({
        username: "$state.people.username",
        addresses: "$state.people.addresses",
      })
      .project({
        _id: "$username",
        addresses: 1,
      });

    const res = [];
    for (const person of people) {
      res.push(person._id);
      res.push(...person.addresses);
    }

    ctx.body = res;
    await next();
  });
  router.get("/user/:input/:query*", async (ctx, next) => {
    const input = ctx.params.input;
    const query = ctx.params.query;

    if (/[a-z0-9_-]{43}/i.test(input)) {
      if (query === "balances") {
        ctx.body = await fetchBalances(input);
      } else if (query === "orders") {
        ctx.body = await fetchOrders(input);
      } else if (query === "creations") {
        const res = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.people" })
          .project({
            "state.people.username": 1,
            hasAddress: {
              $in: [input, "$state.people.addresses"],
            },
          })
          .match({ hasAddress: true })
          .limit(1);

        if (res.length) {
          ctx.body = (
            await Contract.aggregate()
              .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
              .unwind({ path: "$state.tokens" })
              .match({
                "state.tokens.lister": res[0].state.people.username,
                "state.tokens.type": "art",
              })
              .project({ "state.tokens.id": 1 })
              .limit(4)
          ).map((item: any) => item.state.tokens.id);
        } else {
          ctx.body = [];
        }
      } else if (query === "owns") {
        const res = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.tokens" })
          .match({ "state.tokens.type": "art" })
          .lookup({
            from: "contracts",
            localField: "state.tokens.id",
            foreignField: "_id",
            as: "contract",
          })
          .unwind({ path: "$contract" })
          .match({
            [`contract.state.balances.${input}`]: { $exists: true },
          })
          .project({ "state.tokens.id": 1 })
          .limit(4);

        ctx.body = res.map((item: any) => item.state.tokens.id);
      } else {
        const res = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.people" })
          .project({
            "state.people": 1,
            hasAddress: {
              $in: [input, "$state.people.addresses"],
            },
          })
          .match({ hasAddress: true })
          .limit(1);

        if (res.length) {
          ctx.body = res[0].state.people;
        } else {
          ctx.body = "Not Found";
        }
      }
    } else {
      if (query === "creations") {
        const res = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.tokens" })
          .match({
            "state.tokens.lister": input,
            "state.tokens.type": "art",
          })
          .project({ "state.tokens.id": 1 })
          .limit(4);

        ctx.body = res.map((item: any) => item.state.tokens.id);
      } else if (query === "owns") {
        const userResponse = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.people" })
          .match({ "state.people.username": input })
          .project({
            _id: null,
            addresses: "$state.people.addresses",
          });

        if (userResponse.length) {
          const addresses = userResponse[0].addresses;
          const ids = new Set();

          for (const address of addresses) {
            const res = await Contract.aggregate()
              .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
              .unwind({ path: "$state.tokens" })
              .match({ "state.tokens.type": "art" })
              .lookup({
                from: "contracts",
                localField: "state.tokens.id",
                foreignField: "_id",
                as: "contract",
              })
              .unwind({ path: "$contract" })
              .match({
                [`contract.state.balances.${address}`]: { $exists: true },
              })
              .project({ "state.tokens.id": 1 })
              .limit(4);

            res.forEach((item: any) => ids.add(item.state.tokens.id));
          }

          ctx.body = [...ids];
        }
      } else {
        const res = await Contract.aggregate()
          .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
          .unwind({ path: "$state.people" })
          .project({
            "state.people": 1,
            hasUsername: {
              $eq: [input, "$state.people.username"],
            },
          })
          .match({ hasUsername: true })
          .limit(1);

        if (res.length) {
          ctx.body = res[0].state.people;
        } else {
          ctx.body = "Not Found";
        }
      }
    }

    await next();
  });

  router.post("/notification", async (ctx, next) => {
    const data = ctx.request.body;
    await handleNotification(
      data.action,
      data.txID,
      data.signature,
      data.address
    );
    ctx.body = "Success";
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

  router.get("/site/artwork/:id?", async (ctx, next) => {
    const idFilter = ctx.params.id ? { "state.tokens.id": ctx.params.id } : {};
    const res: any = await Contract.aggregate()
      .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
      .unwind({ path: "$state.tokens" })
      .match({ "state.tokens.type": "art", ...idFilter })
      .sample(1)
      .lookup({
        from: "contracts",
        localField: "state.tokens.id",
        foreignField: "_id",
        as: "contract",
      })
      .unwind({ path: "$contract" })
      .project({
        _id: "$state.tokens.id",
        name: "$contract.state.name",
        owner: {
          $first: {
            $filter: {
              input: "$state.people",
              as: "person",
              cond: {
                $eq: ["$$person.username", "$state.tokens.lister"],
              },
            },
          },
        },
      })
      .limit(1);

    ctx.body = {
      id: res[0]._id,
      name: res[0].name,
      owner: res[0].owner,
    };

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

  router.get("/site/artworks/random", async (ctx, next) => {
    ctx.body = await getRandomArts();

    await next();
  });

  // Run the app.
  cache.use(router.routes());
  cache.listen(process.env.PORT || 8080);
})();
