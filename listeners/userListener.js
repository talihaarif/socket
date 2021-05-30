const { saveUser, userOffline, userOnline, usersOnline } = require("../utils/user");
const { sendWebhookError } = require("../utils/webhook");

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
      console.log(error);
      sendWebhookError(error, "getOnlineUsers listener");
    }
    });

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
        sendWebhookError(error, "unarchivedFromCompany listener", id);
    }
  });

};

module.exports = userListener;