const { saveUser, userOffline, userOnline, usersOnline } = require("../utils/user");
const { sendWebhookError } = require("../utils/webhook");
const { default: axios } = require("axios");

const configuration = {
  headers: {
    "Content-Type": "application/json",
    "token":"MyNodeToken"
  },
};
const url = process.env.URL;

/**
 * This is the code for User Listener. This is called when emit is send from frontend on user operations.
 *
 * 1. On getOnlineUsers emit from frontend:
 *      Call usersOnline function.
 * 2. On newPlugin emit from frontend:
 *      Send addPlugin emit to the user who added plugin.
 * 3. On deletePlugin emit from frontend:
 *      Send removePlugin emit to the user who deleted plugin.
 */

const userListener = (io,socket) => {
    //Inactive listen
    socket.on("setActiveStatus", (active) => {
        // setActiveStatus(active,socket.id);
    });

    socket.on("getOnlineUsers", () => {
      try{
        usersOnline(io,socket);
      } catch (error) {
        sendWebhookError(error, "getOnlineUsers listener");
      }
    });

  socket.on("switchCompany", (id) => {
    try{
      console.log("switch from " ,socket.company_id);
      console.log("switch to " ,id);
      userOffline(socket);
      socket.company_id = id;
      saveUser(socket.id, socket.user_id, id, socket.status);
      // userOnline(socket);
      usersOnline(io,socket);
    } catch (error) {
        sendWebhookError(error, "switchCompany listener", id);
    }
  });

};

const userAllowAccessModified = async(data,io) =>{
  try {
    let company_id = data.company_id;
    let body1 = JSON.stringify({ company_id, attribute:"company_member", operation:"update" });
    let result1 = await axios.post(url+"api/getSubAdmins", body1, configuration);
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins){
        io.to(user_id).emit("userAllowAccessModified", {company_id:data.company_id,user_id:data.user_id, allow_access:data.allow_access,hash:data.hash});
    }
  } catch (err) {
    sendWebhookError(err, "userAllowAccessModified listener", data);
  }
}

module.exports = {
  userListener,
  userAllowAccessModified,
}