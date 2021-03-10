const { saveUserEmits } = require("../utils/emitQueue");

const user = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const user = conn
        .collection("users")
        .watch({ fullDocument: "updateLookup" });

    console.log("user change stream running");

    /*
    ---Listening to user Table---

    Case update:
    Three cases are handel in update operation 
    of user table.
    1) If profile_picture is changed then the emit is send
    to the all the companies in which this user
    is added in company_id room.
    2) If full name is changed then the emit is send
    to the all the companies in which this user
    is added in company_id room.
    3) If user is added in any company then emit contating
    company_id will be send to the user_id room.

    */
   user.on("change", (change) => {
    let userTemp = change.fullDocument;
    switch (change.operationType) {
        case "update":
            let userUpdateCheck = change.updateDescription.updatedFields;
            if (
                userUpdateCheck.profile_picture ||
                userUpdateCheck.profile_picture === null
            ) {
                userTemp.company_ids.map((company_id) => {
                    io.to(company_id).emit("userProfilePictureUpdate", {
                        user_id: userTemp._id,
                        profile_picture: userTemp.profile_picture,
                        user_token:change._id
                    });
                });
                saveUserEmits({user_id: userTemp._id,
                    profile_picture: userTemp.profile_picture,
                    user_token:change._id,emit_to:userTemp._id,emit_name:"userProfilePictureUpdate"})
            } else if (userUpdateCheck.full_name) {
                userTemp.company_ids.map((company_id) => {
                    io.to(company_id).emit("userNameUpdate", {
                        user_id: userTemp._id,
                        name: userTemp.full_name,
                        user_token:change._id
                    });
                });
                saveUserEmits({user_id: userTemp._id,
                    name: userTemp.full_name,
                    user_token:change._id,emit_to:userTemp._id,emit_name:"userNameUpdate"});
            } else if(userUpdateCheck.two_fa){
                io.to(userTemp._id).emit("userTwoFaChange", {
                    user_id: userTemp._id,
                    two_fa:userTemp.two_fa,
                    user_token:change._id
                });
                saveUserEmits({user_id: userTemp._id,
                    two_fa:userTemp.two_fa,
                    user_token:change._id,emit_to:userTemp._id,emit_name:"userTwoFaChange"});
                
            } else if(userUpdateCheck.in_app_notification){
                io.to(userTemp._id).emit("userInAppNotification", {
                    user_id: userTemp._id,
                    in_app_notification:userTemp.in_app_notification,
                    user_token:change._id
                });
                saveUserEmits({user_id: userTemp._id,
                    in_app_notification:userTemp.in_app_notification,
                    user_token:change._id,emit_to:userTemp._id,emit_name:"userInAppNotification"});
            } else if(userUpdateCheck.notification_sound){
                io.to(userTemp._id).emit("userNotificationSound", {
                    user_id: userTemp._id,
                    notification_sound:userTemp.notification_sound,
                    user_token:change._id
                });
                saveUserEmits({user_id: userTemp._id,
                    notification_sound:userTemp.notification_sound,
                    user_token:change._id,emit_to:userTemp._id,emit_name:"userNotificationSound"});
            }
            
            break;
    }
});
};

module.exports = user;