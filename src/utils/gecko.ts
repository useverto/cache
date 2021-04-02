import Contract from "../models/contract";
import Order from "../models/order";

export const getPairs = async () => {
  const orders = await Order.find({}, "token");
  const contracts = await Contract.find({}, "state.ticker");
  const tokens = Array.from(new Set(orders.map((order: any) => order.token)));

  const res = [];
  for (const id of tokens) {
    if (id !== "ETH") {
      const contract = contracts.find((contract: any) => contract._id === id);

      res.push({
        ticker_id: id,
        base: "AR",
        target: contract.state.ticker,
      });
    }
  }

  return res;
};

export const getHistorical = async (token: string, limit: number) => {
  const res: {
    trade_id: string;
    price?: number;
    base_volume: number;
    target_volume: number;
    trade_timestamp: number;
    type: "buy" | "sell";
  }[] = [];

  const orders = await Order.find({ token, status: "success" });
  for (const order of orders) {
    const type = order.inputUnit === "AR" ? "buy" : "sell";

    let price;
    if (type === "buy") {
      price = order.input / order.output;
    } else {
      price = order.output / order.input;
    }

    res.push({
      trade_id: order._id,
      price,
      base_volume: order.input,
      target_volume: order.output,
      trade_timestamp: order.timestamp,
      type,
    });
  }

  return {
    buy: res
      .filter((trade) => trade.type === "buy")
      .slice(0, limit || undefined),
    sell: res
      .filter((trade) => trade.type === "sell")
      .slice(0, limit || undefined),
  };
};
