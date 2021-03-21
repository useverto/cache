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

export const fetchContract = async (contract: string): Promise<boolean> => {
  const res: any = await gql
    .search()
    .max((await client.network.getInfo()).height)
    .appName("SmartWeaveAction")
    .tag("Contract", contract)
    .findOne();

  const latestInteraction = res[0]?.node.id ?? "";

  let cache: any | undefined;
  try {
    const res = fs.readFileSync(`./cache/${contract}.json`).toString();
    cache = JSON.parse(res);
  } catch {}

  if (cache && cache.interaction === latestInteraction) {
    return false;
  } else {
    const res = await readContract(client, contract, undefined, true);

    try {
      fs.mkdirSync("./cache");
    } catch {}
    fs.writeFileSync(
      `./cache/${contract}.json`,
      JSON.stringify({ interaction: latestInteraction, res })
    );

    return true;
  }
};

export const getCommunities = async (): Promise<string[]> => {
  const res: any = await gql
    .search()
    .appName("SmartWeaveContract")
    .tag("Contract-Src", "ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI")
    .findAll();

  return res.map((edge: any) => edge.node.id);
};

export const getTokens = async (): Promise<string[]> => {
  const res: any = await gql.search().tag("Cache", "List").findAll();

  const tokens: string[] = [];
  for (const edge of res) {
    const tags = edge.node.tags;
    const token = tags.find((tag: any) => tag.name === "Token")?.value;

    if (token && /[a-z0-9_-]{43}/i.test(token)) tokens.push(token);
  }

  return tokens;
};

export const getTime = (): number => {
  return parseFloat(new Date().getTime().toString().slice(0, -3));
};
