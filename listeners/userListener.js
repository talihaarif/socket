const { setActiveStatus } = require("../utils/user");


const userListener = (io,socket) => {
    //Inactive listen
    socket.on("setActiveStatus", (active) => {
        // setActiveStatus(active,socket.id);
    });

    socket.on("getOnlineUsers", () => {
      usersOnline(io,socket);
    });

};

module.exports = userListener;