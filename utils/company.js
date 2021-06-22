const {  userOffline } = require("./user");
const { joinCompanyRoom, leaveCompanyRoom } = require("./room");
const { default: axios } = require("axios");
const { sendWebhookError } = require("../utils/webhook");

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = process.env.URL;

/*
* This function is used to create the company room.
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinCompanyRoom function.
*/
const createCompanyRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data._id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinCompanyRoom(clientSocket,result.data.support_channels,data.companies);
        }
    } catch (error) {
        sendWebhookError(error, "createCompanyRoom", data);
    }

};

/*
* This function deletes the company room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveCompanyRoom function and call userOffline function.
*/
const deleteCompanyRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data._id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveCompanyRoom(clientSocket,data.support_channels,data.companies);
            userOffline(clientSocket);
        }
    } catch (error) {
        sendWebhookError(error, "deleteCompanyRoom", data);
    }

};

/*
* This function sends the emit on new company insertion
* Call api/companyData backend route using axios and store the response in a variable.
* Call createCompanyRoom function.
* Send newCompany emit to the user who created the company.
* Call saveCompanyEmits function to store the event for one minute.
*/
const companyInsert=async(companyTemp,io,resumeToken, hash)=>{
    try{
        let company_id=companyTemp._id.toString();
        let email=companyTemp.user_email;
        const body = JSON.stringify({ company_id,email });
        setTimeout(async()=>{
            const result =await axios.post(url+"api/companyData", body, configuration);
            createCompanyRoom(io,result.data);
            io.to(result.data._id).emit("newCompany",{company:result.data.companies[0],company_token:resumeToken,hash:hash});
        },3000);
        
    } catch (err) {
        sendWebhookError(err, "companyInsert", companyTemp);
    }
}

const companyFileStatusUpdate=async(companyTemp,io,resumeToken, hash)=>{
    try{
        let company_id=companyTemp._id.toString();
        let body1 = JSON.stringify({ company_id, attribute:"attachments", operation:"update" });
        let result1 = await axios.post(url+"api/getSubAdmins", body1, configuration);
        result1.data.sub_admins.push(result1.data.admin);
        for (let user_id of result1.data.sub_admins){
            io.to(user_id).emit("companyFileStatusChanged",{company_id:companyTemp._id, file_status:companyTemp.file_status ,company_token:resumeToken,hash:hash});
        }
    } catch (err) {
        sendWebhookError(err, "companyFileStatusUpdate", companyTemp);
    }
}

const companyFileIpsUpdate=async(companyTemp,io,resumeToken, hash)=>{
    try{
        let company_id=companyTemp._id.toString();
        let body1 = JSON.stringify({ company_id, attribute:"attachments", operation:"update" });
        let result1 = await axios.post(url+"api/getSubAdmins", body1, configuration);
        result1.data.sub_admins.push(result1.data.admin);
        for (let user_id of result1.data.sub_admins){
            io.to(user_id).emit("companyFileIpsChanged",{company_id:companyTemp._id, file_ips:companyTemp.file_ips ,company_token:resumeToken,hash:hash});
        }
    } catch (err) {
        sendWebhookError(err, "companyFileIpsUpdate", companyTemp);
    }
}

module.exports = {
    createCompanyRoom,
    deleteCompanyRoom,
    companyInsert,
    companyFileStatusUpdate,
    companyFileIpsUpdate,
};