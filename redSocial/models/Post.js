const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: String,
  text: String,
  image: String,
  likes: { type: Number, default: 0 },
  comments: [
    {
      user: String,
      text: String,
      date: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
