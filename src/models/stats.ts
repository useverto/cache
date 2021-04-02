import mongoose from "mongoose";

const contractStatsSchema = new mongoose.Schema({
  _id: String,
  one: Number,
  two: Number,
  three: Number,
});

export const ContractStats = mongoose.model(
  "contractStats",
  contractStatsSchema
);

const orderStatsSchema = new mongoose.Schema({
  _id: String,
  height: Number,
});

export const OrderStats = mongoose.model("orderStats", orderStatsSchema);
