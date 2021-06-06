const { default: axios } = require("axios");
const config = require("config");
const { checkIds, addIds } = require("./channelCache");
const { checkUserIp } = require("./filesCheck");


const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};
const url = config.get("url");

const messageEmit = async (io,emitTo,emitName,messageTemp,ids,hash) =>{
    let result;
    if (messageTemp.replying_id) {
        let message_id = messageTemp.replying_id;
        let body = JSON.stringify({ message_id });
        result = await axios.post(url + "api/getMessage", body, configuration);
        messageTemp.parent = result.data.message;
    }
    if(emitTo===false)
        emitTo=messageTemp.parent.sender_id;
    let id = messageTemp.channel_id;
    delete messageTemp.channel_id;
    if(messageTemp.attachments || messageTemp.parent.attachments){
        console.log("in attachment check");
        filterEmits(io,emitTo,emitName,messageTemp,ids,hash,id)
    }
    else{
        io.to(emitTo).emit(emitName, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
    }
}

const filterEmits=async (io,emitTo,emitName,messageTemp,ids,hash,id)=>{
    let clients = io.sockets.adapter.rooms.get(emitTo);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            console.log("socket user id",clientSocket.user_id);
            console.log("socket user ip",clientSocket.ip);
            console.log("result of check",await checkUserIp(ids.company_id,clientSocket.ip))
            if(clientSocket.ip && await checkUserIp(ids.company_id,clientSocket.ip)){
                io.to(clientSocket.id).emit(emitName, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
            }
        }
}

const getIds = async(channel_id)=>{
    let result;
    let ids = checkIds(channel_id);
    if (ids == false) {
        let body = JSON.stringify({ channel_id });
        result = await axios.post(url + "api/teamAndCompanyId", body, configuration);
        ids = result.data;
        addIds({ channel_id: channel_id, team_id: ids.team_id, company_id: ids.company_id, type: ids.type });
    }
    return ids;
}

const queryMessageInsert=async(io,messageTemp,ids,hash)=>{
    if(messageTemp.replying_id){
        await messageEmit(io,messageTemp.channel_id,"newReplyMessage",messageTemp,ids,hash);
        await messageEmit(io,false,"newReplyMessage",messageTemp,ids,hash);
    }
    else if (messageTemp.is_forwarded) {
        await messageEmit(io,messageTemp.channel_id,"forwardMessage",messageTemp,ids,hash);
        await messageEmit(io,messageTemp.sender_id,"forwardMessage",messageTemp,ids,hash);
    } 
    else{
        await messageEmit(io,messageTemp.channel_id,"newMessage",messageTemp,ids,hash);
        await messageEmit(io,messageTemp.sender_id,"newMessage",messageTemp,ids,hash);
    }
    
}

const queryMessageUpdate= async (io,messageTemp,messageUpdateCheck,ids,update_message_emit_name,hash)=>{
        
    if (messageUpdateCheck.deleted_at) {
        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
        await messageEmit(io,messageTemp.channel_id,update_message_emit_name,messageTemp,ids,hash);
        if(update_message_emit_name == "replyUpdateMessage"){
            await messageEmit(io,false,update_message_emit_name,messageTemp,ids,hash);
        }else
        await messageEmit(io,messageTemp.sender_id,update_message_emit_name,messageTemp,ids,hash);
    } 
    else if (messageUpdateCheck.is_read || messageUpdateCheck.child_read || messageUpdateCheck.pinned_by || (messageUpdateCheck.updated_at && Object.keys(messageUpdateCheck).length == 1)) {
        return 0;
    }
    else {
        await messageEmit(io,messageTemp.channel_id,update_message_emit_name,messageTemp,ids,hash);
        if(update_message_emit_name == "replyUpdateMessage"){
            await messageEmit(io,false,update_message_emit_name,messageTemp,ids,hash);
        }else
            await messageEmit(io,messageTemp.sender_id,update_message_emit_name,messageTemp,ids,hash);
    }
}

module.exports = {
    messageEmit,
    getIds,
    queryMessageInsert,
    queryMessageUpdate
};