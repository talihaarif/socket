const {  channelInsert, channelNameUpdate, channelUnarchived, channelArchived } = require("../utils/channel");
const { saveChannelEmits } = require("../utils/emitQueue");

const channel = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const channel = conn
        .collection("channels")
        .watch({ fullDocument: "updateLookup" });

    console.log("channel change stream running");

    channel.on("change", async(change) => {
        let channelTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                if(channelTemp.default==false)
                    channelInsert(channelTemp,io,change._id);
                break;
            case "update":
                let channelUpdateCheck = change.updateDescription.updatedFields;
                if (channelUpdateCheck.name) {
                    channelNameUpdate(channelTemp,io,change._id);
    
                } else if (channelUpdateCheck.display_name) {
                    io.to(channelTemp.creator_id).emit("channelNameUpdate", {
                            channel: {name:channelTemp.display_name,_id: channelTemp._id},
                            type:channelTemp.type,
                            team_id:channelTemp.team_id,
                            channel_token:change._id
                    });
                    saveChannelEmits({channel: {name:channelTemp.display_name,_id: channelTemp._id},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        channel_token:change._id,emit_to:channelTemp.creator_id,emit_name:"channelNameUpdate"});
                }  else if (
                    channelUpdateCheck.description ||
                    channelUpdateCheck.description === null
                ) {
                    io.to(channelTemp._id.toString()).emit(
                        "channelDescriptionUpdated",
                        { 
                            channel:{name:channelTemp.name,_id: channelTemp._id,description: channelTemp.description},
                            type:channelTemp.type,
                            team_id:channelTemp.team_id,
                            channel_token:change._id
                        }
                    );
                    saveChannelEmits({channel:{name:channelTemp.name,_id: channelTemp._id,description: channelTemp.description},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        channel_token:change._id,emit_to:channelTemp._id.toString(),emit_name:"channelDescriptionUpdated"});
                } else if (
                    channelUpdateCheck.deleted_at ||
                    channelUpdateCheck.deleted_at === null
                ) {
                    if (
                        channelUpdateCheck.deleted_at === null
                    ){
                        channelUnarchived(channelTemp,io,change._id);
                    }
                    else{
                        channelArchived(channelTemp,io,change._id);
                    }
                        
                } else if (channelUpdateCheck.creator_id) {
                    io.to(channelTemp._id.toString()).emit("channelCreatorUpdate", {
                        channel:{name:channelTemp.name,_id: channelTemp._id,creator_id: channelTemp.creator_id},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        channel_token:change._id
                    });
                    saveChannelEmits({channel:{name:channelTemp.name,_id: channelTemp._id,creator_id: channelTemp.creator_id},
                        type:channelTemp.type,
                        team_id:channelTemp.team_id,
                        channel_token:change._id,emit_to:channelTemp._id.toString(),emit_name:"channelCreatorUpdate"});
                }
                break;
        }
    });
};

module.exports = channel;