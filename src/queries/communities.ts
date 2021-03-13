export default `
query($cursor: String) {
  transactions(
    tags: [
      { name: "App-Name", values: ["SmartWeaveContract"] }
      {
        name: "Contract-Src"
        values: ["ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI"]
      }
    ]
    after: $cursor
    first: 100
  ) {
    pageInfo {
      hasNextPage
    }
    edges {
      cursor
      node {
        id
      }
    }
  }
}
`;
