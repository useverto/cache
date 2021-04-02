import Arweave from "arweave";
import ArDB from "ardb";
import { getTradingPosts } from "../utils/verto";
import { OrderStats } from "../models/stats";
import Order from "../models/order";
import Contract from "../models/contract";
import { newContract } from "../utils";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

export const updateOrders = async () => {
  const stats = await OrderStats.findById("__verto__");
  const height = stats ? stats.height : 0;
  const latestHeight = (await client.network.getInfo()).height;

  if (height === latestHeight) {
    // Do nothing and return.
    return;
  } else {
    const posts = await getTradingPosts();

    // Parse the trades
    const trades = await gql
      .search()
      .to(posts)
      .tag("Exchange", "Verto")
      .tag("Type", ["Buy", "Sell", "Swap"])
      .min(height)
      .max(latestHeight)
      .findAll();

    // @ts-ignore
    for (const { node } of trades) {
      const type = node.tags.find((tag: any) => tag.name === "Type").value;

      if (type === "Buy") {
        const token = node.tags.find((tag: any) => tag.name === "Token").value;
        const ticker = await fetchTicker(token);
        const amount = parseFloat(node.quantity.ar);

        await new Order({
          _id: node.id,
          sender: node.owner.address,
          target: node.recipient,
          token,
          input: amount,
          inputUnit: "AR",
          outputUnit: ticker,
          status: "pending",
          timestamp: node.block.timestamp,
        }).save();
      }
      if (type === "Sell") {
        const token = node.tags.find((tag: any) => tag.name === "Contract")
          .value;
        const ticker = await fetchTicker(token);
        const input = node.tags.find((tag: any) => tag.name === "Input").value;
        const amount = JSON.parse(input).qty;

        await new Order({
          _id: node.id,
          sender: node.owner.address,
          target: node.recipient,
          token,
          input: amount,
          inputUnit: ticker,
          outputUnit: "AR",
          status: "pending",
          timestamp: node.block.timestamp,
        }).save();
      }
      if (type === "Swap") {
        const chain = node.tags.find((tag: any) => tag.name === "Chain")?.value;
        const hash = node.tags.find((tag: any) => tag.name === "Hash")?.value;

        if (hash) {
          const value = node.tags.find((tag: any) => tag.name === "Value")
            ?.value;

          if (value) {
            const token = node.tags.find((tag: any) => tag.name === "Token")
              ?.value;

            await new Order({
              _id: node.id,
              sender: node.owner.address,
              target: node.recipient,
              token: chain,
              input: parseFloat(value),
              inputUnit: chain,
              outputUnit: token ? await fetchTicker(token) : "AR",
              status: "pending",
              timestamp: node.block.timestamp,
            }).save();
          }
        } else {
          await new Order({
            _id: node.id,
            sender: node.owner.address,
            target: node.recipient,
            token: chain,
            input: parseFloat(node.quantity.ar),
            inputUnit: "AR",
            outputUnit: chain,
            status: "pending",
            timestamp: node.block.timestamp,
          }).save();
        }
      }
    }

    // Parse the confirmations
    const confirmations = await gql
      .search()
      .from(posts)
      .tag("Exchange", "Verto")
      .tag("Type", "Confirmation")
      .min(height)
      .max(latestHeight)
      .findAll();

    // @ts-ignore
    for (const { node } of confirmations) {
      const match = node.tags.find((tag: any) => tag.name === "Match");
      const swap = node.tags.find((tag: any) => tag.name === "Swap");

      let id;
      if (match) id = match.value;
      if (swap) id = swap.value;

      const order = await Order.findById(id);

      if (order) {
        const recieved = node.tags
          .find((tag: any) => tag.name === "Received")
          .value.split(" ")[0];

        order.status = "success";
        order.output =
          order.outputUnit === "AR" || order.outputUnit === "ETH"
            ? recieved
            : Math.floor(recieved);
        await order.save();
      }
    }

    // Parse the cancels
    const cancels = await gql
      .search()
      .to(posts)
      .tag("Exchange", "Verto")
      .tag("Type", "Cancel")
      .min(height)
      .max(latestHeight)
      .findAll();

    // @ts-ignore
    for (const { node } of cancels) {
      const id = node.tags.find((tag: any) => tag.name === "Order").value;
      const order = await Order.findById(id);

      if (order) {
        order.status = "cancelled";
        await order.save();
      }
    }

    // Parse the returns
    const returns = await gql
      .search()
      .from(posts)
      .tag("Exchange", "Verto")
      .tag("Type", ["Buy-Return", "Sell-Return", "Swap-Return"])
      .min(height)
      .max(latestHeight)
      .findAll();

    // @ts-ignore
    for (const { node } of returns) {
      const id = node.tags.find((tag: any) => tag.name === "Order").value;
      const order = await Order.findById(id);

      if (order) {
        order.status = "returned";
        await order.save();
      }
    }

    if (stats) {
      stats.height = latestHeight;
      await stats.save();
    } else {
      await new OrderStats({
        _id: "__verto__",
        height: latestHeight,
      }).save();
    }
  }
};

const fetchTicker = async (id: string): Promise<string> => {
  let contract = await Contract.findById(id, `state.ticker`);
  if (contract) {
    return contract.state.ticker;
  } else {
    await newContract(id);
    return await fetchTicker(id);
  }
};
