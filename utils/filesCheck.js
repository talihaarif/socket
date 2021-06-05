const Company = require("../model/Company");
const { sendWebhookError } = require("../utils/webhook");

let company = [];

/*
Get all the token from database and
and save them in token array to verify the
user before opening connection with sockets
*/
const getAllCompanies = async() => {
    try {
        company = await Company.find({}).select({ "file_status": 1,"file_ips":1});
        console.log(company);
    } catch (error) {
        sendWebhookError(error, "getAllCompanies");
    }
};


module.exports = {
    getAllCompanies
};