const {  teamInsert, teamUnarchived, teamArchived } = require("../utils/team");
const { saveTeamEmits } = require("../utils/emitQueue");
const { sendWebhookError } = require("../utils/webhook");
var hash = require('object-hash');

const team = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const team = conn.collection("teams").watch({ fullDocument: "updateLookup" });
    console.log("team change stream running");

    /*
    ---Listening to Teams Table---
    When any changes occurs in messages table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    Case insert:

    1) teamInsert function is called in case on insert.

    Case update:
    The cases handled in update operation of teams table are:

    1) If name of the team is changed then emit will be send to team_id room.
    2) If profile image of the team is changed then emit will be send to the team_id room.
    3) If deleted_at of team is set to null then call the teamUnarchived function otherwise call the teamArchived function.

    After any emit is send then saveTeamEmits function is called to store the event for one minute.
    */

    team.on("change", async(change) => {
        try{
        let teamTemp = change.fullDocument;
        let hash_data = hash(change.fullDocument, { algorithm: 'md5', encoding: 'base64' });
        switch (change.operationType) {
            case "insert":
                if(teamTemp.default==false)
                    teamInsert(teamTemp,io,change._id, hash_data);
                break;
            case "update":
                let teamUpdateCheck = change.updateDescription.updatedFields;
                if (teamUpdateCheck.name) {
                    io.to(teamTemp._id.toString()).emit("teamNameUpdate", {team_id:teamTemp._id.toString(),company_id:teamTemp.company_id,name:teamTemp.name,team_token:change._id,hashed_data:hash_data});
                    saveTeamEmits({team_id:teamTemp._id.toString(),company_id:teamTemp.company_id,name:teamTemp.name,team_token:change._id,emit_to:teamTemp._id.toString(),emit_name:"teamNameUpdate",hashed_data:hash_data});
                } else if (
                    teamUpdateCheck.profile_picture ||
                    teamUpdateCheck.profile_picture === null
                ) {
                    io.to(teamTemp._id.toString()).emit("teamProfileUpdate", {team_id:teamTemp._id.toString(),company_id:teamTemp.company_id,profile_picture:teamTemp.profile_picture,team_token:change._id,hashed_data:hash_data});
                    saveTeamEmits({team_id:teamTemp._id.toString(),company_id:teamTemp.company_id,profile_picture:teamTemp.profile_picture,team_token:change._id,emit_to:teamTemp._id.toString(),emit_name:"teamProfileUpdate",hashed_data:hash_data});
                } else if (
                    teamUpdateCheck.deleted_at ||
                    teamUpdateCheck.deleted_at === null
                ) {
                    if (teamUpdateCheck.deleted_at === null){
                        teamUnarchived(teamTemp,io,change._id, hash_data);
                    }
                    else {
                        teamArchived(teamTemp,io,change._id, hash_data);
                    }
                }
                break;
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "team_change stream", change);
    }
    });
};

module.exports = team;