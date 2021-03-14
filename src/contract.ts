import { fetchCache } from "./utils";

if (process.env.CONTRACT_ID) fetchCache(process.env.CONTRACT_ID);
else console.log("No contract ID");
