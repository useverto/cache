export default `
query($contract: [String!]!, $block: Int) {
  transactions(
    tags: [
      { name: "App-Name", values: "SmartWeaveAction" }
      { name: "Contract", values: $contract }
    ]
    first: 1
    block: { max: $block }
  ) {
    edges {
      node {
        id
      }
    }
  }
}
`;
