import Contract from "../models/contract";

export const getCommunities = async (type: "random" | "top") => {
  const query = Contract.aggregate()
    .project({
      "state.name": 1,
      "state.ticker": 1,
      count: {
        $size: {
          $ifNull: [
            {
              $objectToArray: "$state.balances",
            },
            [],
          ],
        },
      },
      settings: {
        $ifNull: [
          {
            $arrayToObject: "$state.settings",
          },
          {},
        ],
      },
    })
    .match({
      "settings.communityLogo": {
        $exists: true,
        $ne: "",
      },
    });

  let res: any;
  if (type === "random") {
    res = await query.sample(4);
  }
  if (type === "top") {
    res = await query.sort({ count: -1 }).limit(4);
  }

  return res!.map((elem: any) => {
    return {
      id: elem._id,
      name: elem.state.name,
      ticker: elem.state.ticker,
      logo: elem.settings.communityLogo,
    };
  });
};
