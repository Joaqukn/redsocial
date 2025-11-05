const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: String,
  title: String,
  text: String,
  image: String,
  created_at: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
});

module.exports = mongoose.model('Post', postSchema);
