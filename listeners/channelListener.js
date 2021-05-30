const { default: axios } = require("axios");
const config = require("config");
const { deleteChannelRoom, createChannelRoom } = require("../utils/channel");
const { sendWebhookError } = require("../utils/webhook");

const configuration = {   
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

 const joinChannel = (data,io)=>{
    try{
        io.to(data.user_ids[0]).emit('publicChannelJoined',data);
        io.to(data.channel_id).emit("userAddedInChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "join channel listener", data);
    }
 }

 const newMemberInChannel =async(data,io)=>{
    try{
        io.to(data.channel_id).emit("userAddedInChannel", data );
        if(data.type=='private'){
            for (let user_id of data.user_ids){
                let channel_id=data.channel_id;
                try {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result =await axios.post(url+"api/channelData", body, configuration);
                    createChannelRoom(io,result.data);
                    io.to(user_id).emit("addedInChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
                } catch (err) {
                    console.log(err.response.data);
                }
            }
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "newMemberInChannel listener", data);
    }
 }

 const removedFromChannel = async(data,io)=>{
    try{
        if(data.type=='private'){
            for (let user_id of data.user_ids){
                let channel_id=data.channel_id;
                try {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result =await axios.post(url+"api/channelData", body, configuration);
                    deleteChannelRoom(io,result.data);
                    io.to(user_id).emit("removedChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:{_id:channel_id,name:result.data.channel.name},hash:data.hash});
                } catch (err) {
                    console.log(err.response.data);
                }
            }
        }
        io.to(data.channel_id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "removedFromChannel listener", data);
    }
 }

 const leaveChannel = (data,io) =>{
    try{
        if(data.channel.type=='private')
            deleteChannelRoom(io,data);
        io.to(data.user_id).emit('channelLeft',data);
        io.to(data.channel._id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "leaveChannel listener", data);
    }
 }

 const muteChannel = (data,io) =>{
    try{
        io.to(data.user_id).emit("channelMuted",data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "muteChannel listener", data);
    }
 }

 const flagChannel = (data,io)=>{
    try{
        io.to(data.user_id).emit("channelFlagged",data);
      } catch (error) {
        console.log(error);
        sendWebhookError(error, "flagChannel listener", data);
      }
 }


module.exports = {
    joinChannel,
    newMemberInChannel,
    removedFromChannel,
    leaveChannel,
    muteChannel,
    flagChannel
};