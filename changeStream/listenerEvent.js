const { joinChannel, newMemberInChannel, removedFromChannel, leaveChannel, muteChannel, flagChannel } = require("../listeners/channelListener");
const { removedFromCompany, unarchivedFromCompany, addUserInNewCompany } = require("../listeners/companyListener");
const { userAddedInTeam, usersAddedInTeams, leaveTeam, userRemovedFromTeam } = require("../listeners/teamListener");
const { messagesRead, messageRead, markSeenAllReplies, markSeenSingleReplies, replyReadBy, removeReaction, addReaction } = require("../listeners/messageListener");
const { userAllowAccessModified } = require("../listeners/userListener");
const { createHash } = require("../utils/hash");
const { sendWebhookError } = require("../utils/webhook");

const listenerEvent = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const listenerEvent = conn
        .collection("listener_events")
        .watch({ fullDocument: "updateLookup" });

    console.log("Listener Event change stream running");

    /*
    ---Listening to company Table---
    Case update:
    one case is handel in update operation 
    of company table.
    1) If company name is changed then the emit is send
    to the company_id.
    */
   listenerEvent.on("change", async (change) => {
        try{
        let listenerEventTemp = change.fullDocument;
        listenerEventTemp.data.hash =createHash(listenerEventTemp.created_at,change)
        switch (change.operationType) {
            case "insert":
                //channel
                if(listenerEventTemp.listener_name == "joinChannel")
                    joinChannel(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "newMemberInChannel")
                    newMemberInChannel(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "removedFromChannel")
                    removedFromChannel(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "leaveChannel")
                    leaveChannel(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "muteChannel")
                    muteChannel(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "flagChannel")
                    flagChannel(listenerEventTemp.data,io);

                //company
                else if(listenerEventTemp.listener_name == "removedFromCompany")
                    removedFromCompany(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "unarchivedFromCompany")
                    unarchivedFromCompany(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "addUserInNewCompany")
                    addUserInNewCompany(listenerEventTemp.data,io);

                //team
                else if(listenerEventTemp.listener_name == "userAddedInTeam")
                    userAddedInTeam(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "usersAddedInTeams")
                    usersAddedInTeams(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "leaveTeam")
                    leaveTeam(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "userRemovedFromTeam")
                    userRemovedFromTeam(listenerEventTemp.data,io);

                //message
                else if(listenerEventTemp.listener_name == "messagesRead")
                    messagesRead(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "messageRead")
                    messageRead(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "markSeenAllReplies")
                    markSeenAllReplies(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "markSeenSingleReplies")
                    markSeenSingleReplies(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "replyReadBy")
                    replyReadBy(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "addReaction")
                    addReaction(listenerEventTemp.data,io);
                else if(listenerEventTemp.listener_name == "removeReaction")
                    removeReaction(listenerEventTemp.data,io);

                //user
                else if(listenerEventTemp.listener_name == "userAllowAccessModified")
                    userAllowAccessModified(listenerEventTemp.data,io);

                break;
        }
    } catch (error) {
        sendWebhookError(error, "errorPush change stream", change);
    }
    });
};

module.exports = listenerEvent;