const { createTeamRoom, deleteTeamRoom } = require("../utils/team");
const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");
const { deletePublicPrivateChannelRoom, createPublicPrivateChannelRoom } = require("../utils/channel");
const configuration = {
    headers: {
      "Content-Type": "application/json",
      "token":"MyNodeToken"
    },
  };
const url = config.get("url");

const userAddedInTeam = async(data,io) =>{
    io.to(data.team_id).emit("newUserAddedInTeam", data);
    for (let user_id of data.user_ids){
        let team_id=data.team_id;
        try {
            const body = JSON.stringify({ team_id,user_id });
            const result =await axios.post(url+"api/teamData", body, configuration);
            createTeamRoom(io,result.data);
            createPublicPrivateChannelRoom(io, result.data);
            io.to(user_id).emit("addedInTeam", {company_id:data.company_id,team:result.data.team, public:result.data.public,hash:data.hash});
        } catch (err) {
            console.log(err.response.data);
            sendWebhookError(err, "userAddedInTeam listener", data);
        }
    }
}

const usersAddedInTeams = (data,io) =>{
    try{
        user_ids=data.user_ids.map((el)=> {return el._id});
        data.team_ids.map((team_id)=>{
            company_id=data.company_id;
            io.to(team_id).emit("newUserAddedInTeam", {user_ids,team_id,company_id,hash:data.hash});
        })
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "usersAddedInTeams listener", data);
    }
}

const leaveTeam =async (data,io)=>{
    try{
        let team_id=data.team_id;
        let body = JSON.stringify({ team_id });
        const result =await axios.post(url+"api/teamData", body, configuration);
        deleteTeamRoom(io,result.data);
        deletePublicPrivateChannelRoom(io, result.data);
        io.to(data.user_id).emit("removedFromTeam",{company_id:data.company_id,team_id:data.team._id,_id:data.user_id,hash:data.hash});
        io.to(data.team_id).emit("userLeftTeam", {
            company_id:data.company_id,
            team_id: data.team._id,
            user_ids: [data.user_id],
            hash:data.hash
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "leaveTeam listener", data);
    }
}

const userRemovedFromTeam = async(data,io)=>{
    for (let user_id of data.user_ids){
        let team_id=data.team_id;
        try {
            const body = JSON.stringify({ team_id,user_id });
            const result =await axios.post(url+"api/teamData", body, configuration);
            deleteTeamRoom(io,result.data);
            deletePublicPrivateChannelRoom(io, result.data);
            io.to(user_id).emit("removedFromTeam", {company_id:data.company_id,team_id:data.team_id,_id: user_id,hash:data.hash} );
        } catch (err) {
            console.log(err.response.data);
            sendWebhookError(err, "userRemovedFromTeam listener", data);
        }
    }
    io.to(data.team_id).emit("userLeftTeam",  {company_id:data.company_id,team_id:data.team_id,user_ids:data.user_ids,hash:data.hash} );
}

module.exports = {
    userAddedInTeam,
    usersAddedInTeams,
    leaveTeam,
    userRemovedFromTeam,
};