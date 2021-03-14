"use strict";
exports.__esModule = true;
var utils_1 = require("./utils");
if (process.env.COMMUNITY_ID)
    utils_1.fetchCache(process.env.COMMUNITY_ID);
else
    console.log("No community ID");
