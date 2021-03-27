import Arweave from "arweave";
import ArDB from "ardb";
import cliProgress from "cli-progress";
import { Contract, Stats } from "./models";
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

// Batch Utils

export const fetchStats = async () => {
  const res = await Stats.findById("__verto__");

  const all = await Contract.find();
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

    new Stats({
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

export const updateBatches = async () => {
  const stats = await Stats.findById("__verto__");
  const current = getTime();

  if (current - stats.one >= 180) {
    for (const id of await fetchBatch(1)) {
      const res = await updateContract(id);
      const contract = await Contract.findById(id);

      if (res) {
        // Contract was updated. Keep it in Batch 1.
      } else {
        contract.batch = 2;
        contract.save();
      }
    }

    const stats = await Stats.findById("__verto__");
    stats.one = getTime();
    stats.save();
  }

  if (current - stats.two >= 540) {
    for (const id of await fetchBatch(2)) {
      const res = await updateContract(id);
      const contract = await Contract.findById(id);

      if (res) {
        contract.batch = 1;
      } else {
        contract.batch = 3;
      }
      contract.save();
    }

    const stats = await Stats.findById("__verto__");
    stats.two = getTime();
    stats.save();
  }

  if (current - stats.three >= 1260) {
    for (const id of await fetchBatch(3)) {
      const res = await updateContract(id);
      const contract = await Contract.findById(id);

      if (res) {
        contract.batch = 2;
        contract.save();
      } else {
        // Contract wasn't updated. Keep it in Batch 3.
      }
    }

    const stats = await Stats.findById("__verto__");
    stats.three = getTime();
    stats.save();
  }
};
