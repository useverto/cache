import mongoose from "mongoose";

const contractSchema = new mongoose.Schema({
  _id: String,
  latestInteraction: String,
  state: Object,
  validity: Object,
  batch: Number,
});

const Contract = mongoose.model("contracts", contractSchema);

export default Contract;
