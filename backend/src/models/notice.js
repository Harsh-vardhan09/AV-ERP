const mongoose = require('mongoose');
const noticeSchema = new mongoose.Schema({
  createdByID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  Body: {
    type: String,
    required: true
  },
  category:{
    type:String,
    required:true
  },
  title:{
    type:String,
    required:true
  },
  member:[{
type:String,

  }]
},{timestamps:true});

const Notice = mongoose.model("Notice",noticeSchema);
module.exports = Notice;