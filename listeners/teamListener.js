const { createTeamRoom, deleteTeamRoom } = require("../utils/team");
const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");
const { deletePublicPrivateChannelRoom, createPublicPrivateChannelRoom } = require("../utils/channel");

/**
 * This is the code for Team Listener. This is called when emit is send from frontend on team operations.
 *
 * 1. Declare configuration variable to store headers which will be send with axios requests.
 * 2. On userAddedInTeam emit from frontend:
 *      Send newUserAddedInTeam emit to team room.
 *      For all users of team:
 *      Send axios request to api/teamData route on backend and store response in result variable.
 *      Call createTeamRoom function.
 *      Call createPublicPrivateChannelRoom function.
 *      Send addedInTeam emit to the user.
 * 3. On usersAddedInTeams emit from frontend:
 *      For each team in which the users are added:
 *      Send newUserAddedInTeam emit to team room.
 * 4. On leaveTeam emit from frontend:
 *      Call deleteTeamRoom function.
 *      Call deletePublicPrivateChannelRoom function.
 *      Send removedFromTeam emit to the user who left the team.
 *      Send userLeftTeam emit to team room.
 * 5. On userRemovedFromTeam emit from frontend.
 *      For all users of team:
 *      Send axios request to api/teamData route on backend and store response in result variable.
 *      Call deleteTeamRoom function.
 *      Call deletePublicPrivateChannelRoom function.
 *      Send removedFromTeam emit to the user.
 */

const teamListener = (socket, io) => {
    const configuration = {
        headers: {
          "Content-Type": "application/json",
          "token":"MyNodeToken"
        },
      };
    const url = config.get("url");
    
    socket.on("userAddedInTeam", (data) => {
        socket.to(data.team_id).emit("newUserAddedInTeam", data);
        data.user_ids.map(async(user_id) => {
            let team_id=data.team_id;
            try {
                const body = JSON.stringify({ team_id,user_id });
                const result =await axios.post(url+"api/teamData", body, configuration);
                createTeamRoom(io,result.data);
                createPublicPrivateChannelRoom(io, result.data);
                socket.to(user_id).emit("addedInTeam", {company_id:data.company_id,team:result.data.team, public:result.data.public});
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

    socket.on("leaveTeam", (data) => {       //???
        try{
        deleteTeamRoom(io,data);
        deletePublicPrivateChannelRoom(io, data);
        io.to(data.user_id).emit("removedFromTeam",{company_id:data.company_id,team_id:data.team._id,_id:data.user_id});
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
    
    socket.on("userRemovedFromTeam", (data) => {
        data.user_ids.map(async(user_id) => {
            let team_id=data.team_id;
            try {
                const body = JSON.stringify({ team_id,user_id });
                const result =await axios.post(url+"api/teamData", body, configuration);
                deleteTeamRoom(io,result.data);
                deletePublicPrivateChannelRoom(io, result.data);
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