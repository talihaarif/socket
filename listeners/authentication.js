const { checkToken } = require("../utils/token");
var moment = require('moment');
const {messageListener} = require("./messageListener");
const {userListener} = require("./userListener");
const { usersOnline, userOnline } = require("../utils/user");
const { joinCompanyRoom } = require("../utils/room");
const { sendWebhookError } = require("../utils/webhook");
const { default: axios } = require("axios");

const url = process.env.URL;

/**
 * Middleware to verify token and then open the connection between user and server.
 *
 * 1. Data passed from the front end is parsed and saved in data variable.
 * 2. Check Token function is called That return true if token is valid and false if token is not valid.
 *    - If false is returned then reconnect emit is send back to the user.
 *    - If true is returned then perform following steps:
 * 3. User id and token variables are declared and values are saved in sockets instance.
 * 4. Call joinCompanyRoom function.
 * 5. Send emit to the user selected company id room to notify other user in that company
 *    that some user is online by calling userOnline function.
 * 6. Send list of all the users online in selected company to the logged in user by calling usersOnline function.
 * 7. All listeners are initialized for listening emit from front end.
 * 8. On disconnect remove user from global users array and emit to selected company
 * to notify about the user who is offline.
 *
 *
 */
const authentication = (socket, io) => {
    socket.on("authenticate",async(data) => {
        try{
        // console.log("middleware");
        // console.log(data.email);
        // data = JSON.parse(data.toString());
        if (checkToken(data)) {
            // Declare configuration variable to store headers which will be send with axios requests.
            const configuration = {
                headers: {
                "Content-Type": "application/json",
                "token":data.token
                },
            };
            let result='';
            try {
                console.log("user connected token",data.token);
                // ip=socket.ip;
                const body = JSON.stringify({ip:"127.0.0.1"});
                result = await axios.post(url+"api/get_ids", body, configuration);
                console.log("user connected id from req",result.data._id);
                console.log("user connected email from req",result.data.email);
                let user_id = result.data._id;
                socket.user_id = user_id;
                socket.token = data.token;
                socket.status = data.status;
                socket.join(user_id);
                socket.join(data.token);
                joinCompanyRoom(socket,result.data.support_channels,result.data.companies,true,data.selected_company);
                console.log("user connected", user_id);
                socket.emit("okay", "");            
                // userOnline(socket);
                usersOnline(io,socket);
                //----------listening to emits from frontend start here----------
                if(!socket.check){
                    messageListener(socket);
                    userListener(io,socket);
                }
                socket.check=true;
                //----------listening to emits from frontend end here----------
                socket.on("ping", ()=>{
                    socket.emit("pong",true);
                }); 
            } catch (error) {
                // socket.emit("reconnect", "");
                sendWebhookError(error);
            }
        }
        else{
            if(!socket.reconnectTime)
                socket.reconnectTime=moment();
            let t2 = moment();
            if(moment.duration(t2.diff(socket.reconnectTime)).asSeconds()<60)
                socket.emit("reconnect", "");       
        }
    } catch (error) {
        sendWebhookError(error, "authentication listener", data);
    }
    });
};
module.exports = authentication;