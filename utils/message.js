const { default: axios } = require("axios");
const { checkIds, addIds } = require("./channelCache");
const { sendWebhookError } = require("./webhook");


const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};
const url = process.env.URL;

const messageEmit = async (io,emitTo,emitName,messageTemp,ids,hash,channel_id) =>{
    try {
        let result;
        if (messageTemp.replying_id) {
            let message_id = messageTemp.replying_id;
            let body = JSON.stringify({ message_id });
            result = await axios.post(url + "api/getMessage", body, configuration);
            messageTemp.parent = result.data.message;
        }
        if(emitTo===false)
            emitTo=messageTemp.parent.sender_id;
        delete messageTemp.channel_id;
        io.to(emitTo).emit(emitName, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id, data: messageTemp,hash:hash });
        
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "messageEmit", {emitTo,emitName,messageTemp,ids,hash});
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

const queryMessageInsert=async(io,messageTemp,ids,hash,channel_id)=>{
    console.log("message temp",messageTemp);
    if(messageTemp.replying_id){
        await messageEmit(io,messageTemp.channel_id,"newReplyMessage",messageTemp,ids,hash,channel_id);
        await messageEmit(io,false,"newReplyMessage",messageTemp,ids,hash,channel_id);
    }
    else if (messageTemp.is_forwarded) {
        await messageEmit(io,messageTemp.channel_id,"forwardMessage",messageTemp,ids,hash,channel_id);
        await messageEmit(io,messageTemp.sender_id,"forwardMessage",messageTemp,ids,hash,channel_id);
    } 
    else{
        await messageEmit(io,messageTemp.channel_id,"newMessage",messageTemp,ids,hash,channel_id);
        await messageEmit(io,messageTemp.sender_id,"newMessage",messageTemp,ids,hash,channel_id);
    }
    
}

const queryMessageUpdate= async (io,messageTemp,messageUpdateCheck,ids,update_message_emit_name,hash,channel_id)=>{
        
    if (messageUpdateCheck.deleted_at) {
        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
        await messageEmit(io,messageTemp.channel_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
        if(update_message_emit_name == "replyUpdateMessage"){
            await messageEmit(io,false,update_message_emit_name,messageTemp,ids,hash,channel_id);
        }else
        await messageEmit(io,messageTemp.sender_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
    } 
    else if (messageUpdateCheck.is_read || messageUpdateCheck.child_read || messageUpdateCheck.pinned_by || messageUpdateCheck.replied_created_at || messageUpdateCheck.replied_sender_id || (messageUpdateCheck.updated_at && Object.keys(messageUpdateCheck).length == 1)) {
        return 0;
    }
    else {
        await messageEmit(io,messageTemp.channel_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
        if(update_message_emit_name == "replyUpdateMessage"){
            await messageEmit(io,false,update_message_emit_name,messageTemp,ids,hash,channel_id);
        }else
            await messageEmit(io,messageTemp.sender_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
    }
}

module.exports = {
    messageEmit,
    getIds,
    queryMessageInsert,
    queryMessageUpdate
};