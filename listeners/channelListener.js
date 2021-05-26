const { default: axios } = require("axios");
const config = require("config");
const { deleteChannelRoom, createChannelRoom } = require("../utils/channel");
const { sendWebhookError } = require("../utils/webhook");

/**
 * This is the code for Channel Listener. This is called when emit is send from frontend on channel operations.
 *
 * 1. Declare configuration variable to store headers which will be send with axios requests.
 * 2. On joinChannel emit from frontend:
 *      Send publicChannelJoined emit to the user who joined the channel (if he opened that channel somewhere else).
 *      Send userAddedInChannel emit to channel room.
 * 3. On newMemberInChannel emit from frontend:
 *      Send userAddedInChannel emit to channel room.
 *      If Channel type is private then:
 *      For each user of that private channel.
 *      Send axios request to api/channelData route on backend and store response in result variable.
 *      Call createChannelRoom function.
 *      Send addedInChannel emit to the user.
 * 4. On removedFromChannel emit from frontend:
 *      If Channel type is private then:
 *      For each user of that private channel.
 *      Send axios request to api/channelData route on backend and store response in result variable.
 *      Call deleteChannelRoom function.
 *      Send removedFromChannel emit to the user.
 *      Otherwise send usersRemovedFromChannel emit to channel room.
 * 5. On leaveChannel emit from frontend:
 *      If channel type is private then call deleteChannelRoom function.
 *      Send channelLeft emit to the user who left the channel.
 *      Send usersRemovedFromChannel emit to channel room.
 * 6. On muteChannel emit from frontend.
 *      Send channelMuted emit to the user who muted the channel.
 *
 */
const channelListener = (socket,io) => {
    const configuration = {   
        headers: {
          "Content-Type": "application/json",
          "token":"MyNodeToken"
        },
      };
    const url = config.get("url");

  
    socket.on("joinChannel", (data) => {
        try{
        socket.to(data.user_ids[0]).emit('publicChannelJoined',data);
        socket.to(data.channel_id).emit("userAddedInChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "join channel listener", data);
    }
    });

    socket.on("newMemberInChannel", (data) => {
        try{
        socket.to(data.channel_id).emit("userAddedInChannel", data );
        if(data.type=='private'){
            data.user_ids.map(async(user_id) => {
                let channel_id=data.channel_id;
                try {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result =await axios.post(url+"api/channelData", body, configuration);
                    createChannelRoom(io,result.data);
                    socket.to(user_id).emit("addedInChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel});
                } catch (err) {
                    console.log(err.response.data);
                }
            });
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "newMemberInChannel listener", data);
    }
    });

    socket.on("removedFromChannel", (data) => {
        try{
        if(data.type=='private'){
            data.user_ids.map(async(user_id) => {
                let channel_id=data.channel_id;
                try {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result =await axios.post(url+"api/channelData", body, configuration);
                    deleteChannelRoom(io,result.data);
                    socket.to(user_id).emit("removedChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:{_id:channel_id,name:result.data.channel.name}});
                } catch (err) {
                    console.log(err.response.data);
                }
            });
        }
        socket.to(data.channel_id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "removedFromChannel listener", data);
    }
    });

    socket.on("leaveChannel", (data) => {
        try{
        if(data.channel.type=='private')
            deleteChannelRoom(io,data);
        socket.to(data.user_id).emit('channelLeft',data);
        socket.to(data.channel._id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "leaveChannel listener", data);
    }
    });

    socket.on("muteChannel",(data)=>{
        try{
        socket.to(socket.user_id).emit("channelMuted",data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "muteChannel listener", data);
    }
    })
};

module.exports = channelListener;