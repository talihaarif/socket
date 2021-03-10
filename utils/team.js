const { joinTeamRoom, leaveTeamRoom } = require("./room");
const { default: axios } = require("axios");
const config = require("config");
const { saveTeamEmits } = require("./emitQueue");

const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

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
    }
};

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
    }
};

const teamInsert=async(teamTemp,io,resumeToken)=>{
    let team_id=teamTemp._id.toString();
    const body = JSON.stringify({ team_id });
    try {
        const result =await axios.post(url+"api/teamData", body, configuration);
        createTeamRoom(io,result.data);
        io.to(result.data.user_id).emit("newTeamCreated",{company_id:result.data.company_id,team:result.data.team,team_token:resumeToken});
        saveTeamEmits({company_id:result.data.company_id,team:result.data.team,team_token:resumeToken,emit_to:result.data.user_id,emit_name:"newTeamCreated"});
    } catch (err) {
        console.log(err.response.data);
    }
}

const teamArchived=async(teamTemp,io,resumeToken)=>{
    io.to(teamTemp._id.toString()).emit("teamArchived", {company_id:teamTemp.company_id,team_id:teamTemp._id.toString(),team_token:resumeToken});
    saveTeamEmits({company_id:teamTemp.company_id,team_id:teamTemp._id.toString(),team_token:resumeToken,emit_to:teamTemp._id.toString(),emit_name:"teamArchived"});
    let team_id=teamTemp._id.toString();
    teamTemp.user_ids.map(async(user_id)=>{
        try {
            const body = JSON.stringify({ team_id,user_id });
            const result =await axios.post(url+"api/teamData", body, configuration);
            deleteTeamRoom(io,result.data);
        } catch (err) {
            console.log(err.response.data);
        }
    });
}

const teamUnarchived=async(teamTemp,io,resumeToken)=>{
    let team_id=teamTemp._id.toString();
    teamTemp.user_ids.map(async(user_id)=>{
        try {
            const body = JSON.stringify({ team_id,user_id });
            const result =await axios.post(url+"api/teamData", body, configuration);
            createTeamRoom(io,result.data);
            io.to(user_id).emit("teamUnArchived", {company_id:teamTemp.company_id,team:result.data.team,team_token:resumeToken});
            saveTeamEmits({company_id:teamTemp.company_id,team:result.data.team,team_token:resumeToken,emit_to:user_id,emit_name:"teamUnArchived"});

        } catch (err) {
            console.log(err.response.data);
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