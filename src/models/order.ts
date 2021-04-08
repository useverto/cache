import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  _id: String,
  sender: String,
  target: String,
  token: String,
  input: Number,
  inputUnit: String,
  output: Number,
  outputUnit: String,
  status: String,
  timestamp: Number,
  actions: Array,
});

const Order = mongoose.model("orders", orderSchema);

export default Order;
