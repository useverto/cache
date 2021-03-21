import { getCommunities, getTokens, fetchContract, getTime } from "./utils";
import cliProgress from "cli-progress";
import fs from "fs";

(async () => {
  let groupOne: string[] = [],
    groupTwo: string[] = [],
    groupThree: string[] = [];
  let updateOne: number, updateTwo: number, updateThree: number;

  // On first load, cache everything
  const all = [...(await getCommunities()), ...(await getTokens())];

  const prog = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  prog.start(all.length, 0);

  for (let i = 0; i < all.length; i++) {
    prog.update(i);

    const id = all[i];
    // await fetchContract(id);
    groupOne.push(id);
  }
  prog.stop();

  const current = getTime();
  updateOne = current;
  updateTwo = current;
  updateThree = current;

  // Every 10 minutes, fetch any new communities
  setInterval(async () => {
    const communities = await getCommunities();
    for (const id of communities) {
      if (!fs.existsSync(`./cache/${id}.json`)) {
        await fetchContract(id);
      }
    }
  }, 600000);

  // Update groups
  const main = async () => {
    const all = fs
      .readdirSync("./cache")
      .map((file) => file.split("./cache")[0].split(".json")[0]);

    groupOne.push(
      ...all.filter(
        (id) =>
          !groupOne.find((elem) => elem === id) &&
          !groupTwo.find((elem) => elem === id) &&
          !groupThree.find((elem) => elem === id)
      )
    );

    const current = getTime();

    console.log(
      current - updateOne,
      current - updateTwo,
      current - updateThree
    );

    // 3 minutes
    if (current - updateOne >= 180) {
      let i = groupOne.length;
      while (i--) {
        const id = groupOne[i];
        const res = await fetchContract(id);

        if (!res) {
          groupOne.splice(i, 1);
          groupTwo.push(id);
        }
      }
      updateOne = getTime();
    }
    // 9 minutes
    if (current - updateTwo >= 540) {
      let i = groupTwo.length;
      while (i--) {
        const id = groupTwo[i];
        const res = await fetchContract(id);

        groupTwo.splice(i, 1);
        if (!res) {
          groupThree.push(id);
        } else {
          groupOne.push(id);
        }
      }
      updateTwo = getTime();
    }
    // 21 minutes
    if (current - updateThree >= 1260) {
      let i = groupThree.length;
      while (i--) {
        const id = groupThree[i];
        const res = await fetchContract(id);

        if (res) {
          groupThree.splice(i, 1);
          groupTwo.push(id);
        }
      }
      updateThree = getTime();
    }

    console.log(`\n==========\n`);
    console.log("Group One  size :", groupOne.length);
    console.log("Group Two  size :", groupTwo.length);
    console.log("Group Thre Size :", groupThree.length);
    console.log(`\n==========\n`);

    setTimeout(main, 180000);
  };
  await main();
})();
