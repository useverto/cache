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
