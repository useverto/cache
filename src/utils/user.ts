import Contract from "../models/contract";
import Order from "../models/order";

export const fetchBalances = async (addr: string) => {
  const key = `state.balances.${addr}`;
  const res = await Contract.find(
    {
      [key]: { $exists: true, $gt: 0 },
    },
    `_id state.name state.ticker ${key} state.settings`
  );

  return res
    .map((elem: any) => {
      const logoSetting = elem.state.settings?.find(
        (entry: any) => entry[0] === "communityLogo"
      );

      return {
        id: elem._id,
        balance: elem.state.balances[addr],
        name: elem.state.name,
        ticker: elem.state.ticker,
        logo: logoSetting ? logoSetting[1] : undefined,
      };
    })
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
