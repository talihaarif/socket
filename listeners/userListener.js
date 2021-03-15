const { setActiveStatus } = require("../utils/user");


const userListener = (socket) => {
    //Inactive listen
    socket.on("setActiveStatus", (active) => {
        console.log("in set active status");
        // setActiveStatus(active,socket.id);
      });

};

module.exports = userListener;