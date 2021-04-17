import ArDB from "ardb";
import { GQLEdgeTransactionInterface } from "ardb/lib/faces/gql";
import Arweave from "arweave";
import Contract from "../models/contract";
import Post from "../models/post";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

interface VaultInterface {
  [key: string]: {
    balance: number;
    start: number;
    end: number;
  }[];
}

const fetchAddresses = async (): Promise<string[]> => {
  const res = (await gql
    .search()
    .tag("Exchange", "Verto")
    .tag("Type", "Genesis")
    .only("owner.address")
    .findAll()) as GQLEdgeTransactionInterface[];

  const addresses = res.map((edge) => edge.node.owner.address);

  return [...new Set(addresses)];
};

const getBalance = async (address: string): Promise<number> => {
  const winston = await client.wallets.getBalance(address);
  const ar = client.ar.winstonToAr(winston);

  return parseFloat(ar);
};

const getStake = async (
  address: string,
  vault: VaultInterface
): Promise<number> => {
  let stake = 0;

  if (address in vault) {
    const height = (await client.network.getInfo()).height;
    const filtered = vault[address].filter((a) => height < a.end);

    stake += filtered.map((a) => a.balance).reduce((a, b) => a + b, 0);
  }

  return stake;
};

const getTime = async (
  address: string,
  vault: VaultInterface
): Promise<number> => {
  let time = 0;

  if (address in vault) {
    const height = (await client.network.getInfo()).height;
    const filtered = vault[address].filter((a) => height < a.end);

    for (const entry of filtered) {
      time = Math.max(time, entry.end - entry.start);
    }
  }

  return time;
};

const getEndpoint = async (address: string): Promise<string> => {
  const res = (await gql
    .search()
    .from(address)
    .tag("Exchange", "Verto")
    .tag("Type", "Genesis")
    .only("id")
    .findOne()) as GQLEdgeTransactionInterface[];

  const id = res[0].node.id;
  const config = JSON.parse(
    (
      await client.transactions.getData(id, { decode: true, string: true })
    ).toString()
  );

  const url = config.publicURL.startsWith("https://")
    ? config["publicURL"]
    : "https://" + config.publicURL;
  const endpoint = url.endsWith("/") ? "ping" : "/ping";

  return url + endpoint;
};

export const fetchPosts = async () => {
  const addresses = await fetchAddresses();

  const contract = await Contract.findById(
    "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
    "state.vault"
  );
  const vault: VaultInterface = contract.state.vault;

  for (const address of addresses) {
    const balance = await getBalance(address);
    const stake = await getStake(address, vault);
    const time = await getTime(address, vault);
    const endpoint = await getEndpoint(address);

    const post = await Post.findById(address);
    if (post) {
      post.balance = balance;
      post.stake = stake;
      post.time = time;
      post.endpoint = endpoint;
      await post.save();
    } else {
      await new Post({
        _id: address,
        balance,
        stake,
        time,
        endpoint,
      }).save();
    }
  }

  console.log(`\n... Updated ${addresses.length} trading post records.`);
};
