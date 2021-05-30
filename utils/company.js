const {  userOffline } = require("./user");
const { joinCompanyRoom, leaveCompanyRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

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
            joinCompanyRoom(clientSocket,data.companies);
        }
    } catch (error) {
        console.log(error);
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
            leaveCompanyRoom(clientSocket,data.companies);
            userOffline(clientSocket);
        }
    } catch (error) {
        console.log(error);
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
        console.log(err);
        sendWebhookError(err, "companyInsert", companyTemp);
    }
}

module.exports = {
    createCompanyRoom,
    deleteCompanyRoom,
    companyInsert
};