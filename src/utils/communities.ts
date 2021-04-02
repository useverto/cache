import ArDB from "ardb";
import Arweave from "arweave";
import Contract from "../models/contract";
import { newContract } from "./contracts";

const client = new Arweave({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const gql = new ArDB(client);

const fetchCommunityIDs = async () => {
  const res: any = await gql
    .search()
    .appName("SmartWeaveContract")
    .tag("Contract-Src", "ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI")
    .findAll();

  return res.map((edge: any) => edge.node.id);
};

export const fetchCommunities = async () => {
  console.log(`\nFetching communities ...`);
  let counter = 0;

  const ids = await fetchCommunityIDs();
  const all = (await Contract.find({}, "_id")).map(
    (contract: any) => contract._id
  );

  for (const id of ids) {
    if (all.indexOf(id) === -1) {
      await newContract(id);
      counter++;
    }
  }

  console.log(`\n... Fetched ${counter} new contracts.`);
};
