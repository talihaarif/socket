const { checkToken } = require("../utils/token");
const channelListener = require("./channelListener");
const teamListener = require("./teamListener");
const companyListener = require("./companyListener");
const messageListener = require("./messageListener");
const userListener = require("./userListener");
const { usersOnline, userOnline } = require("../utils/user");
const { joinCompanyRoom } = require("../utils/room");
const { getEmits } = require("../utils/emitQueue");
const { sendWebhookError } = require("../utils/webhook");

/**
 * Middleware to verify token and then open the connection between user and server.
 *
 * 1. Data passed from the front end is parsed and saved in data variable.
 * 2. Check Token function is called That return true if token is valid and false if token is not
 * valid.
 *    - If true is returned then next() is called to build the connection.
 *    - If false is returned then error is send back to the user.
 * 3. User id and token variables are declared and values are saved in sockets instance.
 * 4. Loop through all the companies,teams and channels to make/join the companies, teams and channels rooms.
 *    - If index is 0 then make that company as selected company and save that company id
 *      in socket instance and save that user in node global users array.
 * 5. Send emit to the user selected company id room to notify other user in that company
 *    that some user is online.
 * 6. Send list of all the users online in selected company to the logged in user.
 * 7. All listeners are initialized for listening emit from front end.
 * 8. On disconnect remove user from global users array and emit to selected company
 * to notify about the user who is offline.
 *
 *
 */
const authentication = (socket, io) => {
    socket.on("authenticate", (data) => {
        try{
        // console.log("middleware");
        // console.log(data.email);
        // data = JSON.parse(data.toString());
        if (checkToken(data)) {
            let user_id = data._id;
            socket.user_id = user_id;
            socket.token = data.token;
            socket.join(user_id);
            joinCompanyRoom(socket,data.companies,true,data.selected_company);
            console.log("user connected", user_id);
            socket.emit("okay", "");            
            userOnline(socket);
            usersOnline(io,socket);
            //----------listening to emits from frontend start here----------
            if(!socket.check){
                channelListener(socket,io);
                teamListener(socket, io);
                companyListener(socket,io);
                messageListener(socket,io);
                userListener(io,socket);
            }
            socket.check=true;
            //----------listening to emits from frontend end here----------
            getEmits(data,io);
            socket.on("ping", ()=>{
                socket.emit("pong",true);
            });            

        }
        else{
            socket.emit("reconnect", "");            
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });
};
module.exports = authentication;