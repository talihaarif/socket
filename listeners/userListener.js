const { setActiveStatus } = require("../utils/user");
const { sendWebhookError } = require("../utils/webhook");


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