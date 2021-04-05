const { savePermissionEmits } = require("../utils/emitQueue");

const permission = (conn, io) => {
    // opening watcher for permissions table.
    const permission = conn
        .collection("permissions")
        .watch({ fullDocument: "updateLookup" });

    console.log("permission change stream running");
    /*
    When any changes occurs in permissions table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is updated.
    1) If any document is updated then send emit to the user whose permission is changed.
    After any emit is send then savePermissionEmit function is called to store the event for one minute.
    */
    permission.on("change", async(change) => {
        let permissionTemp = change.fullDocument;
        let permissions=[];
        switch (change.operationType) {
            case "update":
                permissionTemp.permissions_data.map((el)=>{
                    permissions.push({company_id:el.company_id,permission:{attachments:el.attachments,channel:el.channel,company:el.company,company_member:el.company_member,ip:el.ip,team:el.team}});
                });
                io.to(permissionTemp.user_id).emit("permissionsUpdated",{permissions});
                savePermissionEmits({permissions:permissionTemp.permissions_data,emit_to:permissionTemp.user_id,emit_name:"permissionsUpdated"});
                break;
        }
    });
};

module.exports = permission;