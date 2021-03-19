import Arweave from "arweave";
import ArDB from "ardb";
import fs from "fs";
import { readContract } from "smartweave";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

export const fetchCache = async (contract: string) => {
  const res: any = await gql
    .search()
    .appName("SmartWeaveAction")
    .tag("Contract", contract)
    .findOne({ block: { max: (await client.network.getInfo()).height } });

  const edge = res[0];
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
  const res: any = await gql
    .search()
    .appName("SmartWeaveContract")
    .tag("Contract-Src", "ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI")
    .findAll();

  const communities = [];

  for (const edge of res) {
    const id = edge.node.id;

    await fetchCache(id);
    communities.push(id);
  }

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
