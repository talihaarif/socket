const { default: axios } = require("axios");
const { deleteCompanyRoom, createCompanyRoom } = require("../utils/company");
const { sendWebhookError } = require("../utils/webhook");
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = process.env.URL;

const removedFromCompany =async (data,io) =>{
    let email=data.user_email;
    let company_id=data.company_id;
    try {
        const body = JSON.stringify({ company_id,email });
        const result =await axios.post(url+"api/companyData", body, configuration);
        deleteCompanyRoom(io,result.data);
        io.to(data.user_id).emit("removedCompany", data);
        io.to(data.company_id).emit("userRemovedFromCompany",data);
    } catch (err) {
        sendWebhookError(err, "removedFromCompany listener", data);
    }
}

const unarchivedFromCompany =async (data,io) =>{
    let email=data.user_email;
    let company_id=data.company_id;
    try {
        io.to(data.company_id).emit("userUnarchivedFromCompany",data);
        const body = JSON.stringify({ company_id,email });
        const result =await axios.post(url+"api/companyData", body, configuration);
        createCompanyRoom(io,result.data);
        result.data.hash=data.hash
        io.to(data.user_id).emit("unarchivedCompany", result.data);
    } catch (err) {
        sendWebhookError(err, "unarchivedFromCompany listener", data);
    }
}

const addUserInNewCompany =async (data,io) =>{
    io.to(data.company_id).emit("newUserAdded", {company_id:data.company_id,users:data.users,hash:data.hash});
    for (let user of data.users){
        let email=user.email;
        let company_id=data.company_id;
        try {
            const body = JSON.stringify({ company_id,email });
            const result =await axios.post(url+"api/companyData", body, configuration);
            createCompanyRoom(io,result.data);
            result.data.companies[0].hash=data.hash;
            io.to(user._id).emit("addedInNewCompany",result.data.companies[0]);
        } catch (err) {
            sendWebhookError(err, "addUserInNewCompany listener", data);
        }
    }
}


module.exports = {
    removedFromCompany,
    unarchivedFromCompany,
    addUserInNewCompany,
};