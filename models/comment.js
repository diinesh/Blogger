let mongoose = require('mongoose')

let CommentsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
 username: {
    type: String,
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  created: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Comment', CommentsSchema)
