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
