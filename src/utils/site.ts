import Contract from "../models/contract";

export const getCommunities = async () => {
  const res = await Contract.aggregate()
    .project({
      "state.name": 1,
      "state.ticker": 1,
      "state.settings": 1,
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
    })
    .sort({ count: -1 })
    .limit(4);

  return res.map((elem: any) => {
    const logoSetting = elem.state.settings?.find(
      (entry: any) => entry[0] === "communityLogo"
    );

    return {
      id: elem._id,
      name: elem.state.name,
      ticker: elem.state.ticker,
      logo: logoSetting ? logoSetting[1] : undefined,
    };
  });
};
