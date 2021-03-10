const channel = require("./channel");

let channelEmits = [];
let companyEmits = [];
let messageEmits = [];
let teamEmits = [];
let userEmits = [];

const saveChannelEmits = async(emit) => {
    channelEmits.push(emit);
};

const saveCompanyEmits = async(emit) => {
    companyEmits.push(emit);
};

const saveMessageEmits = async(emit) => {
    messageEmits.push(emit);
};

const saveTeamEmits = async(emit) => {
    teamEmits.push(emit);
};

const saveUserEmits = async(emit) => {
    userEmits.push(emit);
};

const removeEmits = async() => {
    channelEmits=[];
    companyEmits=[];
    messageEmits=[];
    teamEmits=[];
    userEmits=[];
};

const getEmits=(data,io)=>{
    let user_id=data._id;
    let tempChannelEmits=channelEmits;
    let tempCompanyEmits=companyEmits;
    let tempMessageEmits=messageEmits;
    let tempTeamEmits=teamEmits;
    let tempUserEmits=userEmits;
    let channels=teams=companies=[];
    data.companies.map((company)=>{
        companies.push(company._id);
        company.teams.map((team)=>{
            teams.push(team._id);
            team.public.map((public)=>{
                channels.push(public._id);
            });
            team.private.map((private)=>{
                channels.push(private._id);
            });
            team.direct.map((direct)=>{
                channels.push(direct._id);
            });
        })
    })
    getChannelEmits(tempChannelEmits,io,channels,user_id);
    getCompanyEmits(tempCompanyEmits,io,companies,user_id);
    getMessageEmits(tempMessageEmits,io,channels,user_id);
    getTeamEmits(tempTeamEmits,io,teams,user_id);
    getUserEmits(tempUserEmits,io,user_id,data);
   
    

}

const getChannelEmits=(tempChannelEmits,io,channels,user_id)=>{
    tempChannelEmits.forEach(channelEmit => {
        if(!channels.includes(channelEmit.channel._id) || !channelEmit.emit_name=='channelUnArchived' || !channelEmit.emit_name=='newChannel' || !channelEmit.emit_name=='newPublicChannel' || !channelEmit.emit_name=='newDirectChannel')
            console.log("continue");
        else if(channelEmit.emit_name=='newChannel')
            if(channelEmit.channel.creator_id==user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='newPublicChannel')
            if(channelEmit.channel.creator_id!=user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='newDirectChannel')
            if(channelEmit.emit_to == user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelNameUpdate')
            if(channelEmit.channel.type=='direct' && channelEmit.emit_to==user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelNameUpdate')
            if(channelEmit.channel.type !='direct')
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelUnArchived')
            if(channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='publicChannelUnArchived')
            if(!channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='deleteChannel')
            if(!channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else
            io.to(user_id).emit(channelEmit.emit_name,channelEmit);
    });
}

const getCompanyEmits=(tempCompanyEmits,io,companies,user_id)=>{
    tempCompanyEmits.forEach(companyEmit => {
        if(!companies.includes(companyEmit.company_id) || !companyEmit.emit_name=='newCompany')
            console.log("continue");
        else if(companyEmit.emit_name=='newCompany')
            if(companyEmit.emit_to==user_id)
                io.to(user_id).emit(companyEmit.emit_name,companyEmit);
        else
            io.to(user_id).emit(companyEmit.emit_name,companyEmit);
    });
}

const getMessageEmits=(tempMessageEmits,io,channels,user_id)=>{
    tempMessageEmits.forEach(messageEmit => {
        if(!channels.includes(messageEmit.channel_id))
            console.log("continue");
        else
            io.to(user_id).emit(messageEmit.emit_name,messageEmit);
    });
}

const getTeamEmits=(tempTeamEmits,io,teams,user_id)=>{
    tempTeamEmits.forEach(teamEmit => {
        if(!teams.includes(teamEmit.team_id) || !teamEmit.emit_name=='newTeamCreated' || !teamEmit.emit_name=='teamUnArchived')
            console.log("continue");
        else if(teamEmit.emit_name=='newTeamCreated')
            if(teamEmit.emit_to==user_id)
                io.to(user_id).emit(teamEmit.emit_name,teamEmit);
        else if(teamEmit.emit_name=='teamUnArchived')
            if(!teamEmit.team.users.includes(user_ids))
                io.to(user_id).emit(teamEmit.emit_name,teamEmit);
        else
            io.to(user_id).emit(teamEmit.emit_name,teamEmit);
    });
}

const getUserEmits=(tempUserEmits,io,user_id,data)=>{
    tempUserEmits.forEach(userEmit => {
        if(userEmit.emit_name=="userProfilePictureUpdate" || userEmit.emit_name=="userNameUpdate")
        {
            data.companies.map((company)=>{
                if(company.users.filter((user)=> {return user._id==userEmit.user_id}))
                    io.to(user_id).emit(tempUserEmits.emit_name,tempUserEmits);
            })
        }
        else if(user_id==tempUserEmits.user_id){
            io.to(user_id).emit(tempUserEmits.emit_name,tempUserEmits);
        }
    });
}


module.exports = {
    saveChannelEmits,
    saveCompanyEmits,
    saveMessageEmits,
    saveTeamEmits,
    saveUserEmits,
    removeEmits,
    getEmits
};
