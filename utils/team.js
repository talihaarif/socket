const { joinTeamRoom, leaveTeamRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const { saveTeamEmits } = require("./emitQueue");
const { sendWebhookError } = require("../utils/webhook");
const { createChannelRoom , deletePublicPrivateChannelRoom, createPublicPrivateChannelRoom} = require("./channel");

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

/*
* This function is used to create the team room.
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinTeamRoom function.
*/
const createTeamRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinTeamRoom(clientSocket,[data.team]);
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "createTeamRoom", data);
    }
};

/*
* This function deletes the team room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveTeamRoom function and call userOffline function.
*/
const deleteTeamRoom = (io,data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if(!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveTeamRoom(clientSocket,[data.team]);
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "deleteTeamRoom", data);
    }
};

/*
* This function sends the emit on new team insertion.
* Call api/teamData backend route using axios and store the response in a variable.
* Call createTeamRoom function.
* Send newTeamCreated emit to the user who created the team.
* Call saveTeamEmits function to store the event for one minute.
* Call api/getSubAdmins backend route using axios to find the sub admins.
* Also push admin in sub_admins array.
* For each sub admin.
*   Call api/teamData backend route using axios and store the response in a variable.
*   Call createTeamRoom function.
*   Call createPublicPrivateChannelRoom function.
*   Send newTeamCreated emit to sub admin.
*   Call saveTeamEmits function to store the event for one minute.
*/
const teamInsert=async(teamTemp,io,resumeToken, hash)=>{
    let team_id=teamTemp._id.toString();
    let body = JSON.stringify({ team_id });
    let result_data = null;
    setTimeout(async()=>{
            const result =await axios.post(url+"api/teamData", body, configuration);
            createTeamRoom(io,result.data);
            createPublicPrivateChannelRoom(io, result.data);
            io.to(result.data.user_id).emit("newTeamCreated",{company_id:result.data.company_id,team:result.data.team, public:result.data.public , private:result.data.private , team_token:resumeToken,hash:hash});
            result.data.sub_admins.map(async(user_id)=>{
                try {
                    body = JSON.stringify({ team_id,user_id });
                    result_data =await axios.post(url+"api/teamData", body, configuration);
                    createTeamRoom(io,result_data.data);
                    createPublicPrivateChannelRoom(io, result_data.data);
                    io.to(user_id).emit("newTeamCreated", {company_id:result_data.data.company_id,team:result_data.data.team, public:result_data.data.public ,team_token:resumeToken,hash:hash});
                } catch (err) {
                    console.log(err);
                    sendWebhookError(err, "teamInsert", teamTemp);
                }
            });
    },3000);
    
}

/*
* This function is used to send emit for team archive operation.
* Send teamArchived emit to team room.
* Call saveTeamEmits function to store the event for one minute.
* For each team user:
*   Call api/teamData backend route using axios and store the response in a variable.
*   Call deleteTeamRoom function.
*   Call deletePublicPrivateChannelRoom function.
*/
const teamArchived=async(teamTemp,io,resumeToken, hash)=>{
        io.to(teamTemp._id.toString()).emit("teamArchived", {company_id:teamTemp.company_id,team_id:teamTemp._id.toString(),team_token:resumeToken,hash:hash});
        let team_id=teamTemp._id.toString();
        teamTemp.user_ids.map(async(user_id)=>{
            try {
                const body = JSON.stringify({ team_id,user_id });
                const result =await axios.post(url+"api/teamData", body, configuration);
                deleteTeamRoom(io,result.data);
                deletePublicPrivateChannelRoom(io, result.data);
            } catch (err) {
                console.log(err);
                sendWebhookError(err, "teamArchived", teamTemp);
            }
        });
}

/*
* This function is used to send emit for team un archive operation.
* For each team user:
*   Call api/teamData backend route using axios and store the response in a variable.
*   Call createTeamRoom function.
*   Call createPublicPrivateChannelRoom function.
*   Send teamUnArchived emit to the team user.
*   Call saveTeamEmits function to store the event for one minute.
* Call teamUnarchiveEmitToSubAdmins function.
*/
const teamUnarchived=async(teamTemp,io,resumeToken, hash)=>{
    let team_id=teamTemp._id.toString();
    teamTemp.user_ids.map(async(user_id)=>{
        try {
            const body = JSON.stringify({ team_id,user_id });
            const result =await axios.post(url+"api/teamData", body, configuration);
            createTeamRoom(io,result.data);
            createPublicPrivateChannelRoom(io, result.data);
            io.to(user_id).emit("teamUnArchived", {company_id:teamTemp.company_id,team:result.data.team,public:result.data.public , private:result.data.private , team_token:resumeToken,hash:hash});
        } catch (err) {
            console.log(err.response.data);
            sendWebhookError(err, "teamUnarchived", teamTemp);
        }
    });
    teamUnarchiveEmitToSubAdmins(teamTemp, team_id, resumeToken, io, hash);
}

/*
* This function is used to send team un archive emit to sub admins. 
* Call api/getSubAdmins backend route using axios to find the sub admins.
* Also push admin in sub_admins array.
* If sub_admin is a member of team then do not send emit.
* Otherwise for each sub admin.
*   Call api/teamData backend route using axios.
*   Call createTeamRoom function.
*   Call createPublicPrivateChannelRoom function.
*   Send teamUnArchived emit to sub admin.
*   Call saveTeamEmits function to store the event for one minute.
*/
const teamUnarchiveEmitToSubAdmins=async(teamTemp, team_id, resumeToken, io, hash)=>{
        let company_id=teamTemp.company_id.toString();
        let body1 = JSON.stringify({ company_id, attribute:"team", operation:"update" });
        let result1 =await axios.post(url+"api/getSubAdmins", body1, configuration);
        let result_data = null;
        result1.data.sub_admins.push(result1.data.admin);
        result1.data.sub_admins.map(async(user_id)=>{
            try {
                if(!teamTemp.user_ids.includes(user_id)){
                    body = JSON.stringify({ team_id,user_id });
                    result_data =await axios.post(url+"api/teamData", body, configuration);
                    createTeamRoom(io,result_data.data);
                    createPublicPrivateChannelRoom(io, result_data.data);
                    io.to(user_id).emit("teamUnArchived", {company_id:result_data.data.company_id,team:result_data.data.team,public:result_data.data.public , private:result_data.data.private , team_token:resumeToken,hash:hash});
                }
            } catch (err) {
                console.log(err);
                sendWebhookError(err, "teamUnarchiveEmitToSubAdmins", teamTemp);
            }
        });
}

module.exports = {
    createTeamRoom,
    deleteTeamRoom,
    teamInsert,
    teamArchived,
    teamUnarchived
};