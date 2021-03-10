const {  teamInsert, teamUnarchived, teamArchived } = require("../utils/team");
const { saveTeamEmits } = require("../utils/emitQueue");

const team = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const team = conn.collection("teams").watch({ fullDocument: "updateLookup" });
    console.log("team change stream running");

    /*
    ---Listening to Teams Table---

    Case update:
    There cases are handel in update operation 
    of teams table.
    1) Name of the team is changed then emit will be
    send to the company_id+team_id room.
    2) Profile Image of the team is changed then emit will be
    send to the company_id+team_id room.
    3) Team is Archived then emit will be send to all the
    user which are in this team.

    */

    team.on("change", async(change) => {
        let teamTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                if(teamTemp.default==false)
                    teamInsert(teamTemp,io,change._id);
                break;
            case "update":
                let teamUpdateCheck = change.updateDescription.updatedFields;
                if (teamUpdateCheck.name) {
                    io.to(teamTemp._id.toString()).emit("teamNameUpdate", {team_id:teamTemp._id.toString(),name:teamTemp.name,team_token:change._id});
                    saveTeamEmits({team_id:teamTemp._id.toString(),name:teamTemp.name,team_token:change._id,emit_to:teamTemp._id.toString(),emit_name:"teamNameUpdate"});
                } else if (
                    teamUpdateCheck.profile_picture ||
                    teamUpdateCheck.profile_picture === null
                ) {
                    io.to(teamTemp._id.toString()).emit("teamProfileUpdate", {team_id:teamTemp._id.toString(),profile_picture:teamTemp.profile_picture,team_token:change._id});
                    saveTeamEmits({team_id:teamTemp._id.toString(),profile_picture:teamTemp.profile_picture,team_token:change._id,emit_to:teamTemp._id.toString(),emit_name:"teamProfileUpdate"});
                } else if (
                    teamUpdateCheck.deleted_at ||
                    teamUpdateCheck.deleted_at === null
                ) {
                    if (teamUpdateCheck.deleted_at === null){
                        teamUnarchived(teamTemp,io,change._id);
                    }
                    else {
                        teamArchived(teamTemp,io,change._id);
                    }
                }
                break;
        }
    });

    
};

module.exports = team;