import { fetchCache } from "./utils";

if (process.env.COMMUNITY_ID) fetchCache(process.env.COMMUNITY_ID);
else console.log("No community ID");
