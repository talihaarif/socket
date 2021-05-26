const { saveUserEmits } = require("../utils/emitQueue");
const { sendWebhookError } = require("../utils/webhook");

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
    When any changes occurs in users table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.

    Case update:
    The cases handled in update operation of users table are:

    1) If profile_picture is changed then the emit is send to the all the companies in which this user is added in company_id room.
    2) If full name is changed then the emit is send to the all the companies in which this user is added in company_id room.
    3) If user two_fa is changed then userTwoFaChange emit is send to the user whose two_fa is changed.
    4) If user in_app_notification field is changed then userInAppNotification emit is send to the user whose in_app_notification field is changed.
    5) If user notification_sound field is changed then userNotificationSound emit is send to the user whose notification_sound field is changed.
    
    After any emit is send then saveUserEmits function is called to store the event for one minute.
    */
   user.on("change", (change) => {
    try{
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
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "user change stream", change);
    }
});
};

module.exports = user;