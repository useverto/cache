"use strict";
exports.__esModule = true;
exports["default"] = "\nquery($contract: [String!]!, $block: Int) {\n  transactions(\n    tags: [\n      { name: \"App-Name\", values: \"SmartWeaveAction\" }\n      { name: \"Contract\", values: $contract }\n    ]\n    first: 1\n    block: { max: $block }\n  ) {\n    edges {\n      node {\n        id\n      }\n    }\n  }\n}\n";
