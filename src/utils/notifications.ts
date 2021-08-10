import ArDB from "ardb";
import { GQLEdgeTransactionInterface } from "ardb/lib/faces/gql";
import Arweave from "arweave";
import Notification from "../models/notification";

export const handleNotification = async (
  client: Arweave, 
  gql: ArDB,
  action: "create" | "remove",
  txID: string,
  signature: string,
  address: string
) => {
  const key = await addressToPublicKey(gql, address);

  const data = client.utils.stringToBuffer(
    JSON.stringify({
      action,
      txID,
      address,
    })
  );
  const buffer = client.utils.b64UrlToBuffer(signature);

  if (await client.crypto.verify(key, data, buffer)) {
    let user = await Notification.findById(address);

    if (action === "create") {
      if (!user)
        user = new Notification({
          _id: address,
          items: [],
        });

      const index = user.items.indexOf(txID);
      if (index === -1) user.items = [...user.items, txID];

      await user.save();
    }
    if (action === "remove" && user) {
      const index = user.items.indexOf(txID);
      user.items.splice(index, 1);
      await user.save();
    }
  }
};

const addressToPublicKey = async (gql: ArDB, address: string): Promise<string> => {
  const res = (await gql
    .search()
    .from(address)
    .only(["owner", "owner.key"])
    .findOne()) as GQLEdgeTransactionInterface[];

  if (res.length) {
    const tx = res[0].node;
    return tx.owner.key;
  }

  return "";
};
