const { default: axios } = require("axios");
const { deleteChannelRoom, createChannelRoom } = require("../utils/channel");
const { sendWebhookError } = require("../utils/webhook");

const configuration = {   
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = process.env.URL;

 const joinChannel = async(data,io)=>{
    try{
        io.to(data.channel_id).emit("userAddedInChannel",  data );
        let channel_id= data.channel_id;
        let user_id = data.user_ids[0];
        const body = JSON.stringify({ channel_id,user_id });
        const result =await axios.post(url+"api/channelData", body, configuration);
        createChannelRoom(io,result.data);
        io.to(data.user_ids[0]).emit("addedInChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
    } catch (error) {
        sendWebhookError(error, "join channel listener", data);
    }
 }

 const newMemberInChannel =async(data,io)=>{
    try{
        io.to(data.channel_id).emit("userAddedInChannel", data );
        for (let user_id of data.user_ids){
            let channel_id=data.channel_id;
            try {
                const body = JSON.stringify({ channel_id,user_id });
                const result =await axios.post(url+"api/channelData", body, configuration);
                createChannelRoom(io,result.data);
                io.to(user_id).emit("addedInChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
            } catch (err) {
                sendWebhookError(err, "newMemberInChannel listener", data);
            }
        }
        
    } catch (error) {
        sendWebhookError(error, "newMemberInChannel listener", data);
    }
 }

 const removedFromChannel = async(data,io)=>{
    try{
            for (let user_id of data.user_ids){
                let channel_id=data.channel._id;
                try {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result =await axios.post(url+"api/channelData", body, configuration);
                    deleteChannelRoom(io,result.data);
                    io.to(user_id).emit("removedChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:{_id:channel_id,name:result.data.channel.name},hash:data.hash});
                } catch (err) {
                    sendWebhookError(err, "removedFromChannel listener", data);
                }
            }
        io.to(data.channel._id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        sendWebhookError(error, "removedFromChannel listener", data);
    }
 }

 const leaveChannel = (data,io) =>{
    try{
        deleteChannelRoom(io,data);
        io.to(data.user_id).emit('channelLeft',data);
        io.to(data.channel._id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        sendWebhookError(error, "leaveChannel listener", data);
    }
 }

 const addMemberInSupportChannel = async(data,io) =>{
    try{
        io.to(data.channel_id).emit("userAddedInSupportChannel", data );
        for (let user_id of data.user_ids){
            let channel_id=data.channel_id;
            try {
                const body = JSON.stringify({ channel_id,user_id });
                const result =await axios.post(url+"api/supportChannelData", body, configuration);
                createChannelRoom(io,result.data);
                io.to(user_id).emit("addedInSupportChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
            } catch (err) {
                sendWebhookError(err, "addMemberInSupportChannel listener", data);
            }
        }
        
    } catch (error) {
        sendWebhookError(error, "addMemberInSupportChannel listener", data);
    }
 }

 const removeMemberInSupportChannel = async(data,io) =>{
    try{
        for (let user_id of data.user_ids){
            let channel_id=data.channel._id;
            try {
                const body = JSON.stringify({ channel_id,user_id });
                const result =await axios.post(url+"api/supportChannelData", body, configuration);
                deleteChannelRoom(io,result.data);
                io.to(user_id).emit("removedSupportChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
            } catch (err) {
                sendWebhookError(err, "removeMemberInSupportChannel listener", data);
            }
        }
    io.to(data.channel._id).emit("usersRemovedFromSupportChannel",  data );
    } catch (error) {
        sendWebhookError(error, "removeMemberInSupportChannel listener", data);
    }
 }

 const leaveSupportChannel = async(data,io) =>{
    try{
        try {
            let channel_id= data.channel_id;
            let user_id = data.user_ids[0];
            console.log("leaveSupportChannel user_id is: ", user_id);
            const body = JSON.stringify({ channel_id,user_id });
            const result =await axios.post(url+"api/supportChannelData", body, configuration);
            deleteChannelRoom(io,result.data);
            io.to(user_id).emit('removedSupportChannel', {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
        } catch (err) {
            sendWebhookError(err, "leaveSupportChannel listener", data);
        }
        io.to(data.channel_id).emit("usersRemovedFromSupportChannel",  data );
    } catch (error) {
        sendWebhookError(error, "leaveSupportChannel listener", data);
    }
 }

 const addCreatorInSupportChannel = async(data,io) =>{
    try{
        io.to(data.channel_id).emit("creatorAddedInSupportChannel", data );
        for (let user_id of data.user_ids){
            let channel_id=data.channel_id;
            try {
                const body = JSON.stringify({ channel_id,user_id });
                const result =await axios.post(url+"api/supportChannelData", body, configuration);
                createChannelRoom(io,result.data);
                io.to(user_id).emit("addedInSupportChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
            } catch (err) {
                sendWebhookError(err, "addCreatorInSupportChannel listener", data);
            }
        }
    } catch (error) {
        sendWebhookError(error, "addCreatorInSupportChannel listener", data);
    }
 }

 const removeCreatorInSupportChannel = async(data,io) =>{
    try{
       
        io.to(data.channel._id).emit("removedAsCreatorInSupportChannel",  data );
    } catch (error) {
        sendWebhookError(error, "removeCreatorInSupportChannel listener", data);
    }
 }

 const joinPublicSupportChannel = async(data,io) =>{
    try{
        // io.to(data.channel_id).emit("userAddedInChannel",  data );
        let channel_id= data.channel_id;
        let user_id = data.user_ids[0];
        const body = JSON.stringify({ channel_id,user_id });
        const result =await axios.post(url+"api/supportChannelData", body, configuration);
        createChannelRoom(io,result.data);
        io.to(data.user_ids[0]).emit("addedInSupportChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,hash:data.hash});
    } catch (error) {
        sendWebhookError(error, "joinPublicSupportChannel listener", data);
    }
 }

 const leavePublicSupportChannel = async(data,io) =>{
    try{
        try {
            let channel_id= data.channel_id;
            let user_id = data.user_ids[0];
            const body = JSON.stringify({ channel_id,user_id });
            const result =await axios.post(url+"api/supportChannelData", body, configuration);
            deleteChannelRoom(io,result.data);
            io.to(data.user_id).emit('publicSupportChannelLeft', data);
        } catch (err) {
            sendWebhookError(err, "leavePublicSupportChannel listener", data);
        }
        // deleteChannelRoom(io,data);
        // io.to(data.user_id).emit('publicSupportChannelLeft',data);
        // io.to(data.channel._id).emit("usersRemovedFromChannel",  data );
    } catch (error) {
        sendWebhookError(error, "leavePublicSupportChannel listener", data);
    }
 }

 const muteChannel = (data,io) =>{
    try{
        io.to(data.user_id).emit("channelMuted",data);
    } catch (error) {
        sendWebhookError(error, "muteChannel listener", data);
    }
 }

 const flagChannel = (data,io)=>{
    try{
        io.to(data.user_id).emit("channelFlagged",data);
      } catch (error) {
        sendWebhookError(error, "flagChannel listener", data);
      }
 }


module.exports = {
    joinChannel,
    newMemberInChannel,
    removedFromChannel,
    leaveChannel,
    muteChannel,
    flagChannel,
    addMemberInSupportChannel,
    removeMemberInSupportChannel,
    leaveSupportChannel,
    addCreatorInSupportChannel,
    removeCreatorInSupportChannel,
    joinPublicSupportChannel,
    leavePublicSupportChannel
};