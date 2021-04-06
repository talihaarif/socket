const { default: axios } = require("axios");
const config = require("config");
const { deleteChannelRoom, createChannelRoom } = require("../utils/channel");
const { sendWebhookError } = require("../utils/webhook");

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
        sendWebhookError(error);
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
        sendWebhookError(error);
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
        sendWebhookError(error);
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
        sendWebhookError(error);
    }
    });

    socket.on("muteChannel",(data)=>{
        try{
        socket.to(socket.user_id).emit("channelMuted",data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    })
};

module.exports = channelListener;