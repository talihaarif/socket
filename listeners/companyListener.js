const { default: axios } = require("axios");
const { saveUser, userOffline, userOnline, usersOnline } = require("../utils/user");
const { deleteCompanyRoom, createCompanyRoom } = require("../utils/company");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");

/**
 * This is the code for Company Listener. This is called when emit is send from frontend on company operations.
 *
 * 1. Declare configuration variable to store headers which will be send with axios requests.
 * 2. On removedFromChannel emit from frontend:
 *      Send axios request to api/companyData route on backend and store response in result variable.
 *      Call deleteCompanyRoom function.
 *      Send removedCompany emit to the user who is removed.
 *      Send userRemovedFromCompany emit to company room.
 * 3. On unarchivedFromCompany emit from frontend:
 *      Send userUnarchivedFromCompany emit to company room.
 *      Send axios request to api/companyData route on backend and store response in result variable.
 *      Call createCompanyRoom function.
 *      Send unarchivedCompany emit to the user who is un archived.
 * 4. On switchCompany emit from frontend:
 *      Call userOffline function.
 *      Save company id in socket instance.
 *      Call saveUser function.
 *      Call userOnline function.
 *      Call usersOnline function.
 * 5. On addUserInNewCompany emit from frontend.
 *      Send newUserAdded emit to the company room.
 *      For each user of company:
 *      Send axios request to api/companyData route on backend and store response in result variable.
 *      Call createCompanyRoom function.
 *      Send addedInNewCompany emit to the user.
 */

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
            socket.to(data.company_id).emit("userUnarchivedFromCompany",data);
            const body = JSON.stringify({ company_id,email });
            const result =await axios.post(url+"api/companyData", body, configuration);
            createCompanyRoom(io,result.data);
            socket.to(data.user_id).emit("unarchivedCompany", result.data);
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