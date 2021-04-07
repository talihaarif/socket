const { setActiveStatus } = require("../utils/user");
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
      sendWebhookError(error);
  }
    });

    socket.on("newPlugin",(data)=>{
      try{
      socket.to(data.user_id).emit("addPlugin",data);
    } catch (error) {
      console.log(error);
      sendWebhookError(error);
  }
    });

    socket.on("deletePlugin",(data)=>{
      try{
      socket.to(data.user_id).emit("removePlugin",data);
    } catch (error) {
      console.log(error);
      sendWebhookError(error);
  }
    });
};

module.exports = userListener;