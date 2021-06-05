const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  file_status: {
    type: Boolean,
  },
  file_ips:{
    type:Array,
  },

 
});

module.exports = company = mongoose.model('company', CompanySchema);
