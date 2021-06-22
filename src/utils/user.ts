import Contract from "../models/contract";
import Order from "../models/order";
import { COMMUNITY_CONTRACT } from "./verto";

export const fetchBalances = async (addr: string) => {
  const res = await Contract.aggregate()
    .match({ _id: COMMUNITY_CONTRACT })
    .unwind({ path: "$state.tokens" })
    .lookup({
      from: "contracts",
      localField: "state.tokens.id",
      foreignField: "_id",
      as: "contract",
    })
    .unwind({ path: "$contract" })
    .match({
      "contract.state.balances": { $exists: true },
      [`contract.state.balances.${addr}`]: {
        $exists: true,
        $gt: 0,
      },
    })
    .project({
      _id: "$state.tokens.id",
      name: "$contract.state.name",
      ticker: "$contract.state.ticker",
      balance: `$contract.state.balances.${addr}`,
      settings: {
        $ifNull: [
          {
            $arrayToObject: "$contract.state.settings",
          },
          {},
        ],
      },
    });

  return res
    .map((elem: any) => ({
      id: elem._id,
      balance: elem.balance,
      name: elem.name,
      ticker: elem.ticker,
      logo: elem?.settings?.communityLogo,
    }))
    .sort((a: any, b: any) => b.balance - a.balance);
};

export const fetchOrders = async (addr: string) => {
  const res = await Order.find({ sender: addr });

  return res.map((order: any) => {
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
  });
};
