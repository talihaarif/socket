const { default: axios } = require("axios");
const { saveUser, userOffline, userOnline, usersOnline } = require("../utils/user");
const { deleteCompanyRoom, createCompanyRoom } = require("../utils/company");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");

const companyListener = (socket,io) => {
    const configuration = {
        headers: {
          "Content-Type": "application/json",
          "token":"MyNodeToken"
        },
      };
    const url = config.get("url");
    
    socket.on("removedFromCompany", async(data) => {
        let email=data.user_email;
        let company_id=data.company_id;
        try {
            const body = JSON.stringify({ company_id,email });
            const result =await axios.post(url+"api/companyData", body, configuration);
            deleteCompanyRoom(io,result.data);
            socket.to(data.user_id).emit("removedCompany", data);
            socket.to(data.company_id).emit("userRemovedFromCompany",data);
        } catch (err) {
            console.log(err);
            sendWebhookError(err);
        }
    });

    socket.on("unarchivedFromCompany", async(data) => {
        let email=data.user_email;
        let company_id=data.company_id;
        try {
            const body = JSON.stringify({ company_id,email });
            const result =await axios.post(url+"api/companyData", body, configuration);
            createCompanyRoom(io,result.data);
            socket.to(data.company_id).emit("userUnarchivedFromCompany",data);
        } catch (err) {
            console.log(err);
            sendWebhookError(err);
        }
    });

    /*
    front end will send us the emit when the user
    switch the company so its online status can be maintain
    */
    socket.on("switchCompany", (id) => {
        try{
        console.log("switch from " ,socket.company_id);
        console.log("switch to " ,id);
        userOffline(socket);
        socket.company_id = id;
        saveUser(socket.id, socket.user_id, id);
        userOnline(socket);
        usersOnline(io,socket);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });

    //new new user added in company
    socket.on("addUserInNewCompany",(data)=>{
        socket.to(data.company_id).emit("newUserAdded", {company_id:data.company_id,users:data.users});
        data.users.map(async(user)=>{
            let email=user.email;
            let company_id=data.company_id;
            try {
                const body = JSON.stringify({ company_id,email });
                const result =await axios.post(url+"api/companyData", body, configuration);
                createCompanyRoom(io,result.data);
                socket.to(user._id).emit("addedInNewCompany",result.data.companies[0]);
            } catch (err) {
                console.log(err);
                sendWebhookError(err);
            }
        });
    });
};

module.exports = companyListener;