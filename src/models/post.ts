import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  _id: String,
  balance: Number,
  stake: Number,
  time: Number,
  endpoint: String,
});

const Post = mongoose.model("posts", postSchema);

export default Post;
