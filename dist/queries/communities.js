"use strict";
exports.__esModule = true;
exports["default"] = "\nquery($cursor: String) {\n  transactions(\n    tags: [\n      { name: \"App-Name\", values: [\"SmartWeaveContract\"] }\n      {\n        name: \"Contract-Src\"\n        values: [\"ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI\"]\n      }\n    ]\n    after: $cursor\n    first: 100\n  ) {\n    pageInfo {\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        id\n      }\n    }\n  }\n}\n";
