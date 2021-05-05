import moment from "moment";
import Order from "../models/order";
import { fetchTicker } from "./orders";

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
    .lookup({
      from: "contracts",
      localField: "token",
      foreignField: "_id",
      as: "contract",
    })
    .unwind({ path: "$contract" })
    .lookup({
      from: "contracts",
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["cyh0xsX-prQA0sj3j7PxReEu2qw0BWeRIKjPg8Mcp7Q", "$_id"],
            },
          },
        },
      ],
      as: "community",
    })
    .unwind({ path: "$community" })
    .project({
      input: 1,
      output: 1,
      outputUnit: 1,
      timestamp: 1,

      contract: 1,
      community: {
        $first: {
          $filter: {
            input: "$community.state.tokens",
            as: "token",
            cond: {
              $eq: ["$$token.id", "$token"],
            },
          },
        },
      },
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
          name: "$contract.state.name",
          ticker: "$outputUnit",
          type: "$community.type",
        },
      },
    })
    .sort({ _id: -1 })
    .limit(1);

  if (res.length === 0) {
    return undefined;
  } else {
    const orders = res[0].orders;

    const rates = [];
    for (const order of orders) {
      rates.push(order.input / order.output);
    }

    return {
      price: rates.reduce((a, b) => a + b, 0) / rates.length,
      name: orders[0].name,
      ticker: orders[0].ticker,
      type: orders[0].type,
    };
  }
};

export const getPriceHistory = async (id: string) => {
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

export const getVolume = async (id: string) => {
  const ticker = await fetchTicker(id);

  const res = await Order.aggregate()
    .match({
      token: id,
      inputUnit: ticker,
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
        },
      },
    })
    .sort({ _id: -1 })
    .limit(1);

  if (res.length) {
    const current = moment().add(1, "days").hours(0).minutes(0).seconds(0);

    if (current.unix() === moment(res[0]._id).unix()) {
      return res[0].orders
        .map((order: any) => order.input)
        .reduce((a: any, b: any) => a + b, 0);
    }

    return 0;
  }

  return 0;
};

export const getVolumeHistory = async (id: string) => {
  const ticker = await fetchTicker(id);

  const res = await Order.aggregate()
    .match({
      token: id,
      inputUnit: ticker,
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

      history[current.format("MMM DD, YYYY")] = orders
        .map((order: any) => order.input)
        .reduce((a: any, b: any) => a + b, 0);
      current = moment(current).subtract(1, "days");
    }
  }

  return history;
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
