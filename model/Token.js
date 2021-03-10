const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  token: {
    type: String,
  },
  user_id:{
    type:String,
  },
  is_mobile:{
    type:Boolean,
  },
  is_remember:{
    type:Boolean,
  },
  company_id:{
    type:String
  }

 
});

module.exports = Token = mongoose.model('token', TokenSchema);
