const { joinChannelRoom, leaveChannelRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const channel = require("../changeStream/channel");
const { saveChannelEmits } = require("./emitQueue");
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

const createChannelRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinChannelRoom(clientSocket,[data.channel]);
        }
    } catch (error) {
        console.log(error);
    }
};

const deleteChannelRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveChannelRoom(clientSocket,[data.channel]);
        }
    } catch (error) {
        console.log(error);
    }
};

const channelInsert= async(channelTemp,io,resumeToken)=>{
    let channel_id=channelTemp._id.toString();
    let user_id=channelTemp.creator_id;
    let result;
    try {
        const body = JSON.stringify({ channel_id,user_id });
        result =await axios.post(url+"api/channelData", body, configuration);
        createChannelRoom(io,result.data);
        io.to(user_id).emit("newChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
        saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:user_id,emit_name:"newChannel"});
    } catch (err) {
        console.log(err);
    }
    let resultClone=JSON.parse(JSON.stringify(result.data));
    if(channelTemp.type=='public'){
        resultClone.channel.new_message_count=0;
        resultClone.channel.joined=false;
        resultClone.channel.muted=false;
        resultClone.channel.pinned=false;
        publicChannelJoin(io,resultClone)
        io.to(channelTemp.team_id).emit("newPublicChannel", {company_id:resultClone.company_id,team_id:resultClone.team_id,type:resultClone.type,channel:resultClone.channel,channel_token:resumeToken});
        saveChannelEmits({company_id:resultClone.company_id,team_id:resultClone.team_id,type:resultClone.type,channel:resultClone.channel,channel_token:resumeToken,emit_to:channelTemp.team_id,emit_name:"newPublicChannel"});
    }
    else if(channelTemp.type=='direct' && channelTemp.user_id != channelTemp.creator_id){
        directChannelJoin(io,channelTemp);
        resultClone.channel.name=channelTemp.name;
        io.to(channelTemp.user_id).emit("newDirectChannel", {company_id:resultClone.company_id,team_id:resultClone.team_id,type:resultClone.type,channel:resultClone.channel,channel_token:resumeToken});
        saveChannelEmits({company_id:resultClone.company_id,team_id:resultClone.team_id,type:resultClone.type,channel:resultClone.channel,channel_token:resumeToken,emit_to:channelTemp.user_id,emit_name:"newDirectChannel"});
    }
}

const channelNameUpdate=(channelTemp,io,resumeToken)=>{
    if (channelTemp.type == "direct"){
        io.to(channelTemp.user_id).emit("channelNameUpdate", {
            channel:{name:channelTemp.name,_id: channelTemp._id},
            type:channelTemp.type,
            team_id:channelTemp.team_id,
            channel_token:resumeToken
        });
        saveChannelEmits({channel:{name:channelTemp.name,_id: channelTemp._id},
            type:channelTemp.type,
            team_id:channelTemp.team_id,
            channel_token:resumeToken,emit_to:channelTemp.user_id,emit_name:"channelNameUpdate"});
    }
    else{
        io.to(channelTemp._id.toString()).emit("channelNameUpdate", {
            channel:{name:channelTemp.name,_id: channelTemp._id},
            type:channelTemp.type,
            team_id:channelTemp.team_id,
            channel_token:resumeToken
        });
        saveChannelEmits({channel:{name:channelTemp.name,_id: channelTemp._id},
            type:channelTemp.type,
            team_id:channelTemp.team_id,
            channel_token:resumeToken,emit_to:channelTemp._id.toString(),emit_name:"channelNameUpdate"});
    }
}

const channelArchived=async(channelTemp,io,resumeToken)=>{
    io.to(channelTemp._id.toString()).emit("channelArchived", {team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken});
    saveChannelEmits({team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken,emit_to:channelTemp._id.toString(),emit_name:"channelArchived"});
    let channel_id=channelTemp._id.toString();
    channelTemp.user_ids.map(async(user_id)=>{
        try {
            const body = JSON.stringify({ channel_id,user_id });
            const result =await axios.post(url+"api/channelData", body, configuration);
            deleteChannelRoom(io,result.data);
        } catch (err) {
            console.log(err.response.data);
        }
    });
    let body1 = JSON.stringify({ channel_id, attribute:"channel", operation:"update" });
    let result1 =await axios.post(url+"api/getSubAdmins", body1, configuration);
    let result_data = null;
    let body2 = null;
    result1.data.sub_admins.push(result1.data.admin);
    result1.data.sub_admins.map(async (user_id)=>{
        try {
            if(!channelTemp.user_ids.includes(user_id)){
                body2 = JSON.stringify({ channel_id,user_id });
                result_data =await axios.post(url+"api/channelData", body2, configuration);
                deleteChannelRoom(io,result_data.data);
                io.to(user_id).emit("channelArchived", {team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken});
                saveChannelEmits({team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken,emit_to:channelTemp._id.toString(),emit_name:"channelArchived"});
            }
        } catch (err) {
            console.log(err);
        }
    });
}

const channelUnarchived=async(channelTemp,io,resumeToken)=>{
    try {
        let channel_id=channelTemp._id.toString();
        let result;
        if(channelTemp.user_ids.length==0){
            const body = JSON.stringify({ channel_id });
            result =await axios.post(url+"api/channelData", body, configuration);
            createChannelRoom(io,result.data);
            io.to(result.data.channel.creator_id).emit("channelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
            saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:result.data.channel.creator_id,emit_name:"channelUnArchived"});
        }
        else{
            for (let user_id of channelTemp.user_ids) {
                const body = JSON.stringify({ channel_id,user_id });
                result =await axios.post(url+"api/channelData", body, configuration);
                createChannelRoom(io,result.data);
                io.to(user_id).emit("channelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
            };
            saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:"user_id",emit_name:"channelUnArchived"});
        }
        let body = JSON.stringify({ channel_id,admin:true });
        result =await axios.post(url+"api/channelData", body, configuration);
        if(channelTemp.type=='public'){
            console.log("public",result.data);
            result.data.channel.new_message_count=0;
            result.data.channel.joined=false;
            result.data.channel.muted=false;
            result.data.channel.pinned=false;
            publicChannelJoin(io,result.data)
            io.to(channelTemp.team_id).emit("publicChannelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
            saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:channelTemp.team_id,emit_name:"publicChannelUnArchived"});
        }
        else if(channelTemp.type=='private'){
            if(!channelTemp.user_ids.includes(result.admin_id)){
                io.to(channelTemp.creator_id).emit("deleteChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
                saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:channelTemp.creator_id,emit_name:"deleteChannel"});
            }
        }
        let body1 = JSON.stringify({ channel_id, attribute:"channel", operation:"update" });
        let result1 =await axios.post(url+"api/getSubAdmins", body1, configuration);
        let result_data = null;
        result1.data.sub_admins.push(result1.data.admin);
        result1.data.sub_admins.map(async(user_id)=>{
        try {
            if(!channelTemp.user_ids.includes(user_id)){
                body = JSON.stringify({ channel_id,user_id });
                result_data =await axios.post(url+"api/channelData", body, configuration);
                createChannelRoom(io,result_data.data);
                io.to(user_id).emit("channelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
                saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:result.data.channel.creator_id,emit_name:"channelUnArchived"});
            }
        } catch (err) {
            console.log(err);
        }
    });
    } catch (err) {
        console.log(err);
    }
}

const publicChannelJoin=(io,data)=>{
    try {
        let clients = io.sockets.adapter.rooms.get(data.team_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            if(clientSocket.user_id != data.channel.creator_id)
                joinChannelRoom(clientSocket,[data.channel]);
        }
    } catch (error) {
        console.log(error);
    }
}
const directChannelJoin=(io,data)=>{
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            clientSocket.join(data._id.toString());
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    createChannelRoom,
    deleteChannelRoom,
    channelInsert,
    channelNameUpdate,
    channelUnarchived,
    channelArchived
};
