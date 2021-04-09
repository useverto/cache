import moment from "moment";
import Order from "../models/order";

export const getOrders = async (id: string) => {
  const res = await Order.find({ token: id });

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

export const getPrice = async (id: string) => {
  const res = await Order.find({
    token: id,
    status: "success",
    inputUnit: "AR",
  });

  if (res.length === 0) {
    return undefined;
  } else {
    const high = moment(res[0].timestamp * 1000)
      .add(1, "days")
      .hours(0)
      .minutes(0)
      .seconds(0);
    const low = high.clone().subtract(1, "days");

    const orders = res.filter(
      (order: any) =>
        order.timestamp >= low.unix() && order.timestamp < high.unix()
    );

    const rates = [];
    for (const order of orders) {
      rates.push(order.input / order.output);
    }

    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }
};
