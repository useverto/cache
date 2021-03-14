import { cacheCommunities } from "./utils";

(async () => {
  await cacheCommunities();
  setInterval(cacheCommunities, 600000);
})();
