const { createTeamRoom, deleteTeamRoom } = require("../utils/team");
const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");

const teamListener = (socket, io) => {
    const configuration = {
        headers: {
          "Content-Type": "application/json",
          "token":"MyNodeToken"
        },
      };
    const url = config.get("url");
    
    /*
Listen on userAdded emit:
front end will send us the details of the users that
are added in the team. Then we will make two emits 
one to the users that are added in the team to 
company_id+user_id room and one to the all the teams 
to inform that the users are added in the team to company_id+team_id room.
*/
    socket.on("userAddedInTeam", (data) => {
        socket.to(data.team_id).emit("newUserAddedInTeam", data);
        data.user_ids.map(async(user_id) => {
            let team_id=data.team_id;
            try {
                const body = JSON.stringify({ team_id,user_id });
                const result =await axios.post(url+"api/teamData", body, configuration);
                createTeamRoom(io,result.data);
                socket.to(user_id).emit("addedInTeam", {company_id:data.company_id,team:result.data.team});
            } catch (err) {
                console.log(err.response.data);
                sendWebhookError(err);
            }
        });
    });

    socket.on("usersAddedInTeams", (data) => {
        try{
        user_ids=data.user_ids.map((el)=> {return el._id});
        data.team_ids.map((team_id)=>{
            company_id=data.company_id;
            socket.to(team_id).emit("newUserAddedInTeam", {user_ids,team_id,company_id});
        })
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });

    socket.on("leaveTeam", (data) => {
        try{
        deleteTeamRoom(io,data);
        io.to(data.user_id).emit("removedFromTeam",{company_id:data.company_id,team_id:data.team._id});
        socket.to(data.team_id).emit("userLeftTeam", {
            company_id:data.company_id,
            team_id: data.team._id,
            user_ids: [data.user_id],
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });
    /*
Listen on userRemovedFromTeam emit:
front end will send the emit that this user have been removed from the team
so we notify the user that he/she has been removed from the team 
and also notify the users of the team about the removed users.
 */
    socket.on("userRemovedFromTeam", (data) => {
        data.user_ids.map(async(user_id) => {
            let team_id=data.team_id;
            try {
                const body = JSON.stringify({ team_id,user_id });
                const result =await axios.post(url+"api/teamData", body, configuration);
                deleteTeamRoom(io,result.data);
                io.to(user_id).emit("removedFromTeam", {company_id:data.company_id,team_id:data.team_id,_id: user_id} );
            } catch (err) {
                console.log(err.response.data);
                sendWebhookError(err);
            }
        });
        socket.to(data.team_id).emit("userLeftTeam",  {company_id:data.company_id,team_id:data.team_id,user_ids:data.user_ids} );
    });
};
module.exports = teamListener;