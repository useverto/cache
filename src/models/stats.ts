import mongoose from "mongoose";

const orderStatsSchema = new mongoose.Schema({
  _id: String,
  height: Number,
});

export const OrderStats = mongoose.model("orderStats", orderStatsSchema);
