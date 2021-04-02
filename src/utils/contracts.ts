import ArDB from "ardb";
import Arweave from "arweave";
import Contract from "../models/contract";
import { readContract } from "smartweave";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

export const fetchIDs = async () => {
  const res = await Contract.find({}, "_id");
  return res.map((elem: any) => elem._id);
};

export const fetchContracts = async () => {
  const res = await Contract.find();
  return res.map((elem: any) => {
    return {
      id: elem._id,
      state: elem.state,
      validity: elem.validity,
    };
  });
};

export const fetchContract = async (id: string) => {
  const res = await Contract.findById(id);
  if (!res) {
    return res;
  } else {
    return {
      state: res.state,
      validity: res.validity,
    };
  }
};

export const updateContract = async (id: string) => {
  const cache = await Contract.findById(id);
  const cachedInteraction = cache.latestInteraction;
  const latestInteraction = await fetchLatestInteraction(id);

  if (cachedInteraction === latestInteraction) {
    return false;
  } else {
    try {
      const res = await readContract(client, id, undefined, true);

      cache.latestInteraction = latestInteraction;
      cache.state = res.state;
      cache.validity = res.validity;
      cache.save();

      return true;
    } catch {
      return false;
    }
  }
};

export const newContract = async (id: string) => {
  try {
    const res = await readContract(client, id, undefined, true);

    const contract = new Contract({
      _id: id,
      latestInteraction: await fetchLatestInteraction(id),
      state: res.state,
      validity: res.validity,
      batch: 1,
    });
    await contract.save();
  } catch {}
};

const fetchLatestInteraction = async (id: string) => {
  const res: any = await gql
    .search()
    .max((await client.network.getInfo()).height)
    .appName("SmartWeaveAction")
    .tag("Contract", id)
    .findOne();

  const latestInteraction = res[0]?.node.id ?? "";
  return latestInteraction;
};

export const fetchBalances = async (addr: string) => {
  const key = `state.balances.${addr}`;
  const res = await Contract.find(
    {
      [key]: { $exists: true, $gt: 0 },
    },
    `_id state.name state.ticker ${key} state.settings`
  );

  return res.map((elem: any) => {
    const logoSetting = elem.state.settings?.find(
      (entry: any) => entry[0] === "communityLogo"
    );

    return {
      id: elem._id,
      balance: elem.state.balances[addr],
      name: elem.state.name,
      ticker: elem.state.ticker,
      logo: logoSetting ? logoSetting[1] : undefined,
    };
  });
};