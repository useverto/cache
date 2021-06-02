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
      "settings.communityDescription": {
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
      description: elem.settings.communityDescription,
    };
  });
};

export const getRandomArts = async () => {
  const res = await Contract.aggregate()
    .match({ _id: "mp8gF3oo3MCJ6hBdminh2Uborv0ZS_I1o9my_2dp424" })
    .unwind({ path: "$state.tokens" })
    .match({ "state.tokens.type": "art" })
    .sample(4)
    .lookup({
      from: "contracts",
      localField: "state.tokens.id",
      foreignField: "_id",
      as: "contract",
    })
    .unwind({ path: "$contract" })
    .project({
      _id: "$state.tokens.id",
      name: "$contract.state.name",
      owner: {
        $first: {
          $filter: {
            input: "$state.people",
            as: "person",
            cond: {
              $eq: ["$$person.username", "$state.tokens.lister"],
            },
          },
        },
      },
    });

  return res.map(({ _id, name, owner }) => ({ id: _id, name, owner }));
};
