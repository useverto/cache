import { getCommunities, getTokens, fetchContract, getTime } from "./utils";
import fs from "fs";

(async () => {
  const groupOne: string[] = [],
    groupTwo: string[] = [],
    groupThree: string[] = [];
  let updateOne: number, updateTwo: number, updateThree: number;

  // On first load, cache everything
  const all = [...(await getCommunities()), ...(await getTokens())];
  for (const id of all) {
    await fetchContract(id);
    groupOne.push(id);
  }
  updateOne = getTime();

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
  setInterval(async () => {
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

    // 3 minutes
    if (current - updateOne === 180) {
    }
    // 9 minutes
    if (current - updateTwo === 540) {
    }
    // 21 minutes
    if (current - updateTwo === 1260) {
    }
  }, 180000);
})();
