import { fetchContract } from "./utils";

if (process.env.CONTRACT_ID) fetchContract(process.env.CONTRACT_ID);
else console.log("No contract ID");
