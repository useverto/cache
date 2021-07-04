import Contract from "../models/contract";
import { COMMUNITY_CONTRACT } from "./verto";

export const getCommunities = async (type: "random" | "top") => {
  const query = Contract.aggregate()
    .match({ _id: COMMUNITY_CONTRACT })
    .unwind({ path: "$state.tokens" })
    .match({ "state.tokens.type": "community" })
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
      ticker: "$contract.state.ticker",
      count: {
        $size: {
          $ifNull: [
            {
              $objectToArray: "$contract.state.balances",
            },
            [],
          ],
        },
      },
      settings: {
        $ifNull: [
          {
            $arrayToObject: "$contract.state.settings",
          },
          {},
        ],
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
      name: elem.name,
      ticker: elem.ticker,
      logo: elem.settings.communityLogo,
      description: elem.settings.communityDescription,
    };
  });
};

export const getRandomArts = async () => {
  const collections = (await Contract.aggregate()
    .match({ _id: COMMUNITY_CONTRACT })
    .unwind({ path: "$state.tokens" })
    .match({ "state.tokens.type": "collection" })
    .sample(4)
    .project({
      _id: "$state.tokens.id",
      name: "$state.tokens.name",
      items: "$state.tokens.items",
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
    })).map(({ _id, name, items, owner }) => ({ id: _id, name, items, owner }));

  const arts = (await Contract.aggregate()
    .match({ _id: COMMUNITY_CONTRACT })
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
    })).map(({ _id, name, owner }) => ({ id: _id, name, owner }));

  return [...collections, ...arts].slice(0, 4);
};
