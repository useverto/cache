"use strict";
exports.__esModule = true;
var utils_1 = require("./utils");
if (process.env.CONTRACT_ID)
    utils_1.fetchCache(process.env.CONTRACT_ID);
else
    console.log("No contract ID.");
