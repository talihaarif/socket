const { savePermissionEmits } = require("../utils/emitQueue");
const { sendWebhookError } = require("../utils/webhook");
var hash = require('object-hash');


const permission = (conn, io) => {
    // opening watcher for permissions table.
    const permission = conn
        .collection("permissions")
        .watch({ fullDocument: "updateLookup" });

    console.log("permission change stream running");
    /*
    When any changes occurs in permissions table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is updated.
    1) If any document is updated then send emit to the user whose permission is changed. And send permissions array is send with emit.
    After any emit is send then savePermissionEmits function is called to store the event for one minute.
    */
    permission.on("change", async(change) => {
        try{
        let permissionTemp = change.fullDocument;
        let date = Math.floor(new Date(channelTemp.created_at).getTime()/1000);
        let hash_data = change;
        hash(hash_data, { algorithm: 'md5', encoding: 'base64' });
        let permissions=[];
        switch (change.operationType) {
            case "update":
                permissionTemp.permissions_data.map((el)=>{
                    permissions.push({company_id:el.company_id,permission:{attachments:el.attachments,channel:el.channel,company:el.company,company_member:el.company_member,ip:el.ip,team:el.team}});
                });
                io.to(permissionTemp.user_id).emit("permissionsUpdated",{permissions,hashed_data:hash_data});
                savePermissionEmits({permissions:permissionTemp.permissions_data,emit_to:permissionTemp.user_id,emit_name:"permissionsUpdated",hashed_data:hash_data});
                break;
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "permission change stream", change);
    }
    });
};

module.exports = permission;