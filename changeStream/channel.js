const {  channelInsert, supportChannelInsert, channelNameUpdate, channelUnarchived,supportChannelUnarchived, supportChannelArchived, channelArchived } = require("../utils/channel");
const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");

const channel = (conn, io) => {
    // opening watcher for channels table.
    const channel = conn
        .collection("channels")
        .watch({ fullDocument: "updateLookup" });

    console.log("channel change stream running");
    /*
    When any changes occurs in channels table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    1) If new document is created then change operation type is insert.
        a) In insert if channel is not default then call the channelInsert Function.
    2) If any document is updated then change operation type is update.
        a) if channel name is changed then channelNameUpdate function is called.
        b) if channel display_name is changed then an emit is send to the creator of channel.
        c) if channel description is changed then an emit is send to the channel room.
        d) if channel deleted_at is changed and deleted_at is null then channelUnarchived function is called otherwise
            channelArchived function is called.
        e) if channel creator_id is changed then emit is send to the channel room.
    After any emit is send then saveChannelEmits function is called to store the event for one minute.
    */
    channel.on("change", async(change) => {
        try{
        let channelTemp = change.fullDocument;
        let hash = createHash(channelTemp.created_at,change);
        switch (change.operationType) {
            case "insert":
                if(channelTemp.default==false)
                    channelTemp.type == 'support' ? await supportChannelInsert(channelTemp,io,change._id, hash): await channelInsert(channelTemp,io,change._id, hash);
                break;
            case "update":
                let channelUpdateCheck = change.updateDescription.updatedFields;
                if (channelUpdateCheck.name) {
                    channelNameUpdate(channelTemp,io,change._id,hash);
                } else if (channelUpdateCheck.display_name) {
                    io.to(channelTemp.creator_id).emit("channelNameUpdate", {
                            channel: {name:channelTemp.display_name,_id: channelTemp._id},
                            type:channelTemp.type,
                            team_id:channelTemp.team_id,
                            company_id:channelTemp.company_id,
                            channel_token:change._id,
                            hash:hash
                    });
                }  else if (
                    channelUpdateCheck.description ||
                    channelUpdateCheck.description === null
                ) {
                    let send_emit_to;
                    send_emit_to = channelTemp._id.toString();
                    io.to(send_emit_to).emit(
                        "channelDescriptionUpdated",
                        { 
                            channel:{name:channelTemp.name,_id: channelTemp._id,description: channelTemp.description},
                            type:channelTemp.type,
                            team_id:channelTemp.team_id,
                            company_id:channelTemp.company_id,
                            channel_token:change._id,
                            hash:hash
                        }
                    );
                } else if (
                    channelUpdateCheck.deleted_at ||
                    channelUpdateCheck.deleted_at === null
                ) {
                    if (
                        channelUpdateCheck.deleted_at === null
                    ){
                        channelTemp.type == "support" ? await supportChannelUnarchived(channelTemp,io,change._id, hash): await channelUnarchived(channelTemp,io,change._id, hash);
                    }
                    else{
                        channelTemp.type == "support" ? await supportChannelArchived(channelTemp,io,change._id, hash): await channelArchived(channelTemp,io,change._id, hash);
                    }
                        
                } else if (channelUpdateCheck.creator_id && channelTemp.type!='support') {
                    io.to(channelTemp._id.toString()).emit("channelCreatorUpdate", {
                        channel:{name:channelTemp.name,_id: channelTemp._id,creator_id: channelTemp.creator_id},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        company_id:channelTemp.company_id,
                        channel_token:change._id,
                        hash:hash
                    });
                }else if (channelUpdateCheck.creator_id && channelTemp.type=='support') {
                    io.to(channelTemp._id.toString()).emit("supportChannelCreatorUpdate", {
                        channel:{name:channelTemp.name,_id: channelTemp._id,creator_id: channelTemp.creator_id},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        company_id:channelTemp.company_id,
                        channel_token:change._id,
                        hash:hash
                    });
                }
                break;
        }
    } catch (error) {
        sendWebhookError(error, "channel change stream", change);
    }
    });
    
};

module.exports = channel;