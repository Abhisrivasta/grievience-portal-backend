const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Replied', 'Closed'], 
    default: 'Pending' 
  },
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: false
},
replyMessage: {
  type: String,
  default: ""
},
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inquiry', inquirySchema);