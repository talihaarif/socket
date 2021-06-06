const Company = require("../model/Company");
const { sendWebhookError } = require("../utils/webhook");

let companies = [];

/*
Get all the token from database and
and save them in token array to verify the
user before opening connection with sockets
*/
const getAllCompanies = async() => {
    try {
        companies = await Company.find({}).select({ "file_status": 1,"file_ips":1});
    } catch (error) {
        sendWebhookError(error, "getAllCompanies",null);
    }
};

const updateFileStatus = async(id,file_status) =>{
    try {
        let company_index = companies.findIndex((company) => company._id == id);
        console.log("company ixdex",company_index);
        if (channel_index == -1){
            company_data = await Company.findById(id).select({ "file_status": 1,"file_ips":1});
            companies.push(company_data);
        }
        else{       //if channel is found push the incoming user_ids to the user_ids of the channel
            companies[company_index].file_status=file_status;
        }
        console.log("companies",companies);
    } catch (error) {
        sendWebhookError(error, "updateFileStatus",{id,file_status});
    }
}

const updateFileIps = async(company_id,file_ips) =>{
    try {
        let company_index = companies.findIndex((company) => company._id == company_id);        //find index of the specific channel
        if (channel_index == -1){
            company_data = await Company.findById(company_id).select({ "file_status": 1,"file_ips":1});
            companies.push(company_data);
        }
        else{       //if channel is found push the incoming user_ids to the user_ids of the channel
            companies[company_index].file_ips=file_ips;
        }
    } catch (error) {
        sendWebhookError(error, "updateFileIps",{company_id,file_ips});
    }
}

const addCompanyData = (company) =>{
    companies.push({_id:company._id,file_status:company.file_status,file_ips:company.file_ips});
}

const checkUserIp = async (company_id,user_ip)=>{
    try {
        let company_data = companies.find((company) => company._id == company_id);
        if (!company_data){
            company_data = await Company.findById(company_id).select({ "file_status": 1,"file_ips":1});
            companies.push(company_data);
        }
        if(company_data.file_status == true && !company_data.file_ips.includes(user_ip.toString())){
            console.log("in file check if");
            return false;
        }
        return true;
    } catch (error) {
        sendWebhookError(error, "checkUserIp",{company_id,user_ip});
    }
}


module.exports = {
    getAllCompanies,
    updateFileStatus,
    updateFileIps,
    checkUserIp,
    addCompanyData
};