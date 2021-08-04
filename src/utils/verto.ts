import Arweave from "arweave";
import ArDB from "ardb";
import Contract from "../models/contract";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

// community contract ID
export const COMMUNITY_CONTRACT = "t9T7DIOGxx4VWXoCEeYYarFYeERTpWIC1V3y-BPZgKE";

// invite contract ID
export const INVITE_CONTRACT = "8X7JO-F6sumwynRXbi5YhXHuqKbGlMLPE6zMOR_rWXc";

export const getTradingPosts = async (): Promise<string[]> => {
  const { state } = await Contract.findById(
    "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A",
    `state.vault`
  );
  const vault: {
    [key: string]: {
      balance: number;
      start: number;
      end: number;
    }[];
  } = state.vault;

  const res = await gql
    .search()
    .to("aLemOhg9OGovn-0o4cOCbueiHT9VgdYnpJpq7NgMA1A")
    .tag("Exchange", "Verto")
    .tag("Type", "Genesis")
    .findAll();
  let posts: string[] = Array.from(
    // @ts-ignore
    new Set(res.map((edge: any) => edge.node.owner.address))
  );

  let i = posts.length;
  while (i--) {
    let stake = 0;

    if (posts[i] in vault) {
      const height = (await client.network.getInfo()).height;
      const filtered = vault[posts[i]].filter((a) => height < a.end);

      stake += filtered.map((a) => a.balance).reduce((a, b) => a + b, 0);
    }

    if (stake === 0) {
      posts.splice(i, 1);
    }
  }

  return posts;
};
