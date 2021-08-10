import Arweave from "arweave";
import Contract from "../models/contract";
import { readContract } from "smartweave";
import { COMMUNITY_CONTRACT } from "./verto";

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

export const fetchContract = async (id: string, filter: string | undefined) => {
  const res = await Contract.findById(id, filter);
  if (!res) {
    return res;
  } else {
    return {
      state: res.state,
      validity: res.validity,
    };
  }
};

export const updateContract = async (client: Arweave, id: string) => {
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

export const newContract = async (client: Arweave, id: string) => {
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

export const fetchListedContracts = async (client: Arweave) => {
  console.log(`\nFetching listed contracts ...`);
  let counter = 0;

  const ids = (
    await Contract.aggregate()
      .match({ _id: COMMUNITY_CONTRACT })
      .unwind({ path: "$state.tokens" })
      .project({
        _id: "$state.tokens.id",
      })
  ).map(({ _id }) => _id);
  const all = (await Contract.find({}, "_id")).map(
    (contract: any) => contract._id
  );

  for (const id of ids) {
    if (all.indexOf(id) === -1) {
      await newContract(client, id);
      counter++;
    }
  }

  console.log(`\n... Fetched ${counter} new contracts.`);
};
