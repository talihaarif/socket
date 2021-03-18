const { setActiveStatus } = require("../utils/user");


const userListener = (io,socket) => {
    //Inactive listen
    socket.on("setActiveStatus", (active) => {
        // setActiveStatus(active,socket.id);
    });

    socket.on("getOnlineUsers", () => {
      usersOnline(io,socket);
    });

    socket.on("newPlugin",(data)=>{
      socket.to(data.user_id).emit("addPlugin",data);
    });

    socket.on("deletePlugin",(data)=>{
      socket.to(data.user_id).emit("removePlugin",data);
    });

};

module.exports = userListener;