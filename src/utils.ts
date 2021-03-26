import Arweave from "arweave";
import ArDB from "ardb";
import cliProgress from "cli-progress";
import { Contract } from "./models";
import { readContract } from "smartweave";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

const prog = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Contract Utils

export const fetchIDs = async () => {
  const res = await Contract.find();
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

// CommunityXYZ Utils

const fetchCommunityIDs = async () => {
  const res: any = await gql
    .search()
    .appName("SmartWeaveContract")
    .tag("Contract-Src", "ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI")
    .findAll();

  return res.map((edge: any) => edge.node.id);
};

export const fetchCommunities = async () => {
  console.log(`\nFetching communities ...\n`);
  const ids = await fetchCommunityIDs();

  prog.start(ids.length, 0);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const cache = await fetchContract(id);

    if (!cache) {
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
    }

    prog.update(i + 1);
  }

  prog.stop();
};
