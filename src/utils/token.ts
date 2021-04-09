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
  const res = await Order.aggregate()
    .match({
      token: id,
      status: "success",
      inputUnit: "AR",
    })
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
          input: "$input",
          output: "$output",
        },
      },
    })
    .sort({ _id: -1 })
    .limit(1);

  const orders = res[0].orders;

  if (orders.length === 0) {
    return undefined;
  } else {
    const rates = [];
    for (const order of orders) {
      rates.push(order.input / order.output);
    }

    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }
};

export const getHistory = async (id: string) => {
  const res = await Order.aggregate()
    .match({
      token: id,
      status: "success",
      inputUnit: "AR",
    })
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
          input: "$input",
          output: "$output",
        },
      },
    })
    .sort({ _id: -1 });

  const history: { [date: string]: any } = {};

  if (res.length) {
    let current = moment().add(1, "days").hours(0).minutes(0).seconds(0);
    const stop = moment(res[res.length - 1]._id);

    while (current >= stop) {
      let orders = [];
      const entry = res.find(
        (item: any) => current.unix() === moment(item._id).unix()
      );

      if (entry) {
        orders = entry.orders;
      }

      const rates = [];
      for (const order of orders) {
        rates.push(order.input / order.output);
      }

      history[current.format("MMM DD, YYYY")] =
        rates.reduce((a, b) => a + b, 0) / rates.length;
      current = moment(current).subtract(1, "days");
    }
  }

  return fill(history);
};

const fill = (input: {
  [date: string]: number;
}): { [date: string]: number } => {
  let value = NaN;

  for (const key of Object.keys(input).reverse()) {
    if (isNaN(input[key])) {
      input[key] = value;
    } else {
      value = input[key];
    }
  }

  for (const key of Object.keys(input)) {
    if (isNaN(input[key])) {
      input[key] = value;
    } else {
      value = input[key];
    }
  }

  return input;
};
