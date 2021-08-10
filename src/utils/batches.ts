import ArDB from "ardb";
import Arweave from "arweave";
import Contract from "../models/contract";
import { ContractStats } from "../models/stats";
import { updateContract } from "./contracts";

export const fetchStats = async () => {
  const res = await ContractStats.findById("__verto__");

  const all = await Contract.find({}, "batch");
  const batchOne = all.filter((elem: any) => elem.batch === 1).length;
  const batchTwo = all.filter((elem: any) => elem.batch === 2).length;
  const batchThree = all.filter((elem: any) => elem.batch === 3).length;

  if (res) {
    return {
      oneSize: batchOne,
      oneTimestamp: res.one,
      twoSize: batchTwo,
      twoTimestamp: res.two,
      threeSize: batchThree,
      threeTimestamp: res.three,
    };
  } else {
    const current = getTime();

    new ContractStats({
      _id: "__verto__",
      one: current,
      two: current,
      three: current,
    }).save();

    return {
      oneSize: batchOne,
      oneTimestamp: current,
      twoSize: batchTwo,
      twoTimestamp: current,
      threeSize: batchThree,
      threeTimestamp: current,
    };
  }
};

export const fetchBatch = async (batch: number) => {
  const res = await Contract.find({ batch });
  return res.map((elem: any) => elem._id);
};

export const getTime = () => {
  return parseFloat(new Date().getTime().toString().slice(0, -3));
};

export const updateBatches = async (client: Arweave, gql: ArDB) => {
  const stats = await ContractStats.findById("__verto__");
  const current = getTime();

  if (current - stats.one >= 180) {
    for (const id of await fetchBatch(1)) {
      const res = await updateContract(client, gql, id);
      const contract = await Contract.findById(id);

      if (res) {
        // Contract was updated. Keep it in Batch 1.
      } else {
        contract.batch = 2;
        contract.save();
      }
    }

    const stats = await ContractStats.findById("__verto__");
    stats.one = getTime();
    stats.save();
  }

  if (current - stats.two >= 540) {
    for (const id of await fetchBatch(2)) {
      const res = await updateContract(client, gql, id);
      const contract = await Contract.findById(id);

      if (res) {
        contract.batch = 1;
      } else {
        contract.batch = 3;
      }
      contract.save();
    }

    const stats = await ContractStats.findById("__verto__");
    stats.two = getTime();
    stats.save();
  }

  if (current - stats.three >= 1260) {
    for (const id of await fetchBatch(3)) {
      const res = await updateContract(client, gql, id);
      const contract = await Contract.findById(id);

      if (res) {
        contract.batch = 2;
        contract.save();
      } else {
        // Contract wasn't updated. Keep it in Batch 3.
      }
    }

    const stats = await ContractStats.findById("__verto__");
    stats.three = getTime();
    stats.save();
  }
};
