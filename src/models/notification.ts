import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  _id: String,
  items: Array,
});

const Notification = mongoose.model("notifications", notificationSchema);

export default Notification;
