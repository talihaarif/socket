const { joinChannelRoom, leaveChannelRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const channel = require("../changeStream/channel");
const { saveChannelEmits } = require("./emitQueue");
const { sendWebhookError } = require("../utils/webhook");

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

/*
* This function creates the channel room
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinChannelRoom function.
*/
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
        sendWebhookError(error);
    }
};

/*
* This function deletes the channel room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveChannelRoom function.
*/
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
        sendWebhookError(error);
    }
};

/*
* This function creates the public and private channels room
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinChannelRoom function.
*/
const createPublicPrivateChannelRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinChannelRoom(clientSocket,[data.public]);
            joinChannelRoom(clientSocket,[data.private]);
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

/*
* This function deletes the public and private channels room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveChannelRoom function.
*/
const deletePublicPrivateChannelRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveChannelRoom(clientSocket,[data.public]);
            leaveChannelRoom(clientSocket,[data.private]);
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};


/*
* This function sends the emit on new channel insertion
* Call api/channelData backend route using axios and store the response in a variable.
* Call createChannelRoom function.
* Send newChannel emit to the user who created the channel.
* Call saveChannelEmits function to store the event for one minute.
* Call channelInserEmitInCaseOfPublicDirectChannels function.
*/
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
        sendWebhookError(err);
    }
    channelInserEmitInCaseOfPublicDirectChannels(result, channelTemp, io, resumeToken);
}

/*
* This function sends the emit on channel name update.
* If channel type is direct then send channelNameUpdate emit to the user.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise send channelNameUpdate emit to channel room.
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelNameUpdate=(channelTemp,io,resumeToken)=>{
    try{
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
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

/*
* This function sends the emit on channel archive.
* Send channelArchived emit to channel room.
* Call saveChannelEmits function to store the event for one minute.
* Call the api/channelData backend route using axios and store the response in a variable.
* Call deleteChannelRoom function.
*/
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
                sendWebhookError(err);
            }
        });
        // channelArchiveEmitToSubAdmins(channel_id, channelTemp, resumeToken, io);
}

/*
* This function sends the emit on channel un archive.
* If channel has no users then:
*   Call the api/channelData backend route using axios and store the response in a variable.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to creator of the channel.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise for each user of channel:
*   Call the api/channelData backend route using axios and store the response in a variable.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to creator of the channel.
*   Call saveChannelEmits function to store the event for one minute.
* Call channelUnarchiveEmitForPublicPrivateChannels function.
* Call chanelUnArchiveEmitToSubAdmins function.
*/
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
        channelUnarchiveEmitForPublicPrivateChannels(channel_id,result, io, channelTemp, resumeToken);
        chanelUnArchiveEmitToSubAdmins(channel_id, result, channelTemp, resumeToken, io);
    } catch (err) {
        console.log(err);
        sendWebhookError(err);
    }
}

/*
* This function sends the emit on publicChannelJoin.
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* If user_id of client socket is not equal to creator_id of channel then call joinChannelRoom function.
*/
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
        sendWebhookError(error);
    }
}

/*
* This function sends the emit on directChannelJoin.
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Join the channel room.
*/
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
        sendWebhookError(error);
    }
}

// const channelArchiveEmitToSubAdmins= async(channel_id, channelTemp, resumeToken, io)=>{
//     if (channelTemp.type == "private"){
//         let body1 = JSON.stringify({ channel_id, attribute:"channel", operation:"update" });
//         let result1 = await axios.post(url+"api/getSubAdmins", body1, configuration);
//         var result_data = null;
//         result1.data.sub_admins.push(result1.data.admin);
//         result1.data.sub_admins.map(async (user_id)=>{
//             try {
//                 if(!channelTemp.user_ids.includes(user_id)){
//                     let body2 = JSON.stringify({ channel_id,user_id });
//                     result_data =await axios.post(url+"api/channelData", body2, configuration);
//                     io.to(user_id).emit("channelArchived", {team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken});
//                     saveChannelEmits({team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken,emit_to:user_id,emit_name:"channelArchived"});
//                 }
//             } catch (err) {
//                 console.log(err);
//                 sendWebhookError(err);
//             }
//         });
//     }
// }

/*
* This function is used to send channel un archive emit to sub admins. 
* Call api/getSubAdmins backend route using axios to find the sub admins.
* Also push admin in sub_admins array.
* If sub_admin is a member of channel then do not send emit.
* Otherwise for each sub admin.
*   Call api/channelData backend route using axios.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to sub admin.
*   Call saveChannelEmits function to store the event for one minute.
*/
const chanelUnArchiveEmitToSubAdmins=async(channel_id, result, channelTemp, resumeToken, io)=>{
        let body1 = JSON.stringify({ channel_id, attribute:"channel", operation:"update" });
        let result1 = await axios.post(url+"api/getSubAdmins", body1, configuration);
        let result_data = null;
        result1.data.sub_admins.push(result1.data.admin);
        result1.data.sub_admins.map(async(user_id)=>{
            try {
                if(!channelTemp.user_ids.includes(user_id)){
                    body = JSON.stringify({ channel_id,user_id });
                    result_data =await axios.post(url+"api/channelData", body, configuration);
                    createChannelRoom(io,result_data.data);
                    io.to(user_id).emit("channelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
                    saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:user_id,emit_name:"channelUnArchived"});
                }
            } catch (err) {
                console.log(err);
                sendWebhookError(err);
            }
        });
}

/*
* This function is used to send channel un archive emit in case of public and private channels.
* Call the api/channelData backend route using axios and store the response in a variable.
* If channel type is public then : 
*   Set new_message_count to 0, joined to false, muted to false and pinned to false.
*   Call publicChannelJoin function.
*   Send publicChannelUnArchived emit to team id of channel.
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelUnarchiveEmitForPublicPrivateChannels=async(channel_id, result, io, channelTemp, resumeToken)=>{
    try{
        let body = JSON.stringify({ channel_id,admin:true });
        result = await axios.post(url+"api/channelData", body, configuration);
        if(channelTemp.type=='public'){
            result.data.channel.new_message_count=0;
            result.data.channel.joined=false;
            result.data.channel.muted=false;
            result.data.channel.pinned=false;
            publicChannelJoin(io,result.data)
            io.to(channelTemp.team_id).emit("publicChannelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
            saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:channelTemp.team_id,emit_name:"publicChannelUnArchived"});
        }
        // else if(channelTemp.type=='private'){
        //     if(!channelTemp.user_ids.includes(result.admin_id)){
        //         io.to(channelTemp.creator_id).emit("deleteChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
        //         saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:channelTemp.creator_id,emit_name:"deleteChannel"});
        //     }
        // }
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

/*
* This function is used to send emit on channel insertion in case of public and direct channels.
* If channel type is public then:
*   Set new_message_count to 0, joined to false, muted to false and pinned to false.
*   Call publicChannelJoin function.
*   Send newPublicChannel emit to team id of channel.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise if channel type is direct and user is not the creator of the channel then:
*   Call directChannelJoin function.
*   Send newDirectChannel emit to user.
*   Set name of the channel to the other user name in case of direct channel so that the direct channel name shown to user the the name of the other user
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelInserEmitInCaseOfPublicDirectChannels=(result, channelTemp, io, resumeToken)=>{
    try{
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
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}
module.exports = {
    createChannelRoom,
    deleteChannelRoom,
    channelInsert,
    channelNameUpdate,
    channelUnarchived,
    channelArchived,
    createPublicPrivateChannelRoom,
    deletePublicPrivateChannelRoom
};
