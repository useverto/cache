import Contract from "../models/contract";

export const getCommunities = async () => {
  const res = await Contract.aggregate()
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
    .match({ "settings.communityLogo": { $ne: null } })
    .sort({ count: -1 })
    .limit(4);

  return res.map((elem: any) => {
    return {
      id: elem._id,
      name: elem.state.name,
      ticker: elem.state.ticker,
      logo: elem.settings.communityLogo,
    };
  });
};
