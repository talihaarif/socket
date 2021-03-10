const {  userOffline } = require("./user");
const { joinCompanyRoom, leaveCompanyRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const { saveCompanyEmits } = require("./emitQueue");

const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");


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
    }

};

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
    }

};

const companyInsert=async(companyTemp,io,resumeToken)=>{
    let company_id=companyTemp._id.toString();
    let email=companyTemp.user_email;
    const body = JSON.stringify({ company_id,email });
    try {
    const result =await axios.post(url+"api/companyData", body, configuration);
    createCompanyRoom(io,result.data);
    io.to(result.data._id).emit("newCompany",{company:result.data.companies[0],company_token:resumeToken});
    saveCompanyEmits({company:result.data.companies[0],company_token:resumeToken,emit_to:result.data._id,emit_name:"newCompany"});
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    createCompanyRoom,
    deleteCompanyRoom,
    companyInsert
};