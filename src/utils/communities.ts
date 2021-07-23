import ArDB from "ardb";
import Arweave from "arweave";
import Contract from "../models/contract";
import { newContract } from "./contracts";
import { COMMUNITY_CONTRACT } from "./verto";

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

const fetchListedContracts = async () => {
  const res = await Contract.aggregate()
    .match({ _id: COMMUNITY_CONTRACT })
    .unwind({ path: "$state.tokens" })
    .project({
      _id: "$state.tokens.id",
    });

  return res.map(({ _id }) => _id);
};

// fetch communities and other tokens that are listed
export const fetchCommunities = async () => {
  console.log(`\nFetching communities and tokens ...`);
  let counter = 0;

  const ids = await fetchCommunityIDs();
  const listed = await fetchListedContracts();
  const all = (await Contract.find({}, "_id")).map(
    (contract: any) => contract._id
  );
  const toFetch = ids.concat(listed.filter((id) => ids.includes(id)));

  for (const id of toFetch) {
    if (all.indexOf(id) === -1) {
      await newContract(id);
      counter++;
    }
  }

  console.log(`\n... Fetched ${counter} new contracts.`);
};
