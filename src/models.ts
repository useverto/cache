import mongoose from "mongoose";

const contractSchema = new mongoose.Schema({
  _id: String,
  latestInteraction: String,
  state: Object,
  validity: Object,
  batch: Number,
});

export const Contract = mongoose.model("contracts", contractSchema);

const statsSchema = new mongoose.Schema({
  _id: String,
  one: Number,
  two: Number,
  three: Number,
});

export const Stats = mongoose.model("stats", statsSchema);
