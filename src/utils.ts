import Arweave from "arweave";
import { run, all } from "ar-gql";
import interactionQuery from "./queries/interaction";
import fs from "fs";
import { readContract } from "smartweave";
import communitiesQuery from "./queries/communities";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

export const fetchCache = async (contract: string) => {
  const res = await run(interactionQuery, {
    contract,
    block: (await client.network.getInfo()).height,
  });
  const edge = res.data.transactions.edges[0];
  const latestInteraction = edge ? edge.node.id : "";

  let content: any | undefined;
  let cache: any | undefined;
  try {
    const res = fs.readFileSync(`./cache/${contract}.json`).toString();
    content = JSON.parse(res);
    cache = content[contract];
  } catch {}

  if (cache && cache.interaction === latestInteraction) {
    return cache.res;
  } else {
    const res = await readContract(client, contract, undefined, true);

    try {
      fs.mkdirSync("./cache");
    } catch {}
    fs.writeFileSync(
      `./cache/${contract}.json`,
      JSON.stringify({ interaction: latestInteraction, res })
    );

    return res;
  }
};

export const cacheCommunities = async () => {
  const res = await all(communitiesQuery);
  const communities = [];

  for (const edge of res) {
    const id = edge.node.id;

    await fetchCache(id);
    communities.push(id);
  }

  try {
    fs.mkdirSync("./cache");
  } catch {}
  fs.writeFileSync("./cache/communities.json", JSON.stringify(communities));
};

export const fetchCommunities = async () => {
  const main = async () => {
    const communities = JSON.parse(
      fs.readFileSync("./cache/communities.json").toString()
    );

    const res = [];
    for (const id of communities) {
      const cache = JSON.parse(
        fs.readFileSync(`./cache/${id}.json`).toString()
      );

      res.push({
        id,
        ...cache.res,
      });
    }

    return res;
  };

  try {
    return await main();
  } catch {
    await cacheCommunities();
    return await main();
  }
};
