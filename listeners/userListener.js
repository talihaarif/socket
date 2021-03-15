const { setActiveStatus } = require("../utils/user");


const userListener = (socket) => {
    //Inactive listen
    socket.on("setActiveStatus", (active) => {
        // setActiveStatus(active,socket.id);
      });

};

module.exports = userListener;