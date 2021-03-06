const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");

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
    let hash = createHash(userTemp.created_at,change);
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
                        user_token:change._id,
                        hash:hash
                    });
                });
            } 
            else if (userUpdateCheck.full_name || userUpdateCheck.two_fa || userUpdateCheck.two_fa===false || userUpdateCheck.custom_status || userUpdateCheck.custom_status===null || userUpdateCheck.designation) {
                if(userUpdateCheck.two_fa || userUpdateCheck.two_fa===false){
                    io.to(userTemp._id.toString()).emit("userTwoFaChange", {
                        user_id: userTemp._id,
                        two_fa:userTemp.two_fa,
                        user_token:change._id,
                        hash:hash
                    });
                }
                if(userUpdateCheck.full_name || userUpdateCheck.custom_status || userUpdateCheck.custom_status===null || userUpdateCheck.designation){
                    userTemp.company_ids.map((company_id) => {
                        io.to(company_id).emit("userSettingsUpdated", {
                            user_id: userTemp._id,
                            name: userTemp.full_name,
                            custom_status: userTemp.custom_status,
                            designation: userTemp.designation,
                            user_token:change._id,
                            hash:hash
                        });
                    });
                }
            } 
             else if(userUpdateCheck.in_app_notification){
                io.to(userTemp._id.toString()).emit("userInAppNotification", {
                    user_id: userTemp._id,
                    in_app_notification:userTemp.in_app_notification,
                    user_token:change._id,
                    hash:hash
                });
            } else if(userUpdateCheck.notification_sound===true || userUpdateCheck.notification_sound===false){
                io.to(userTemp._id.toString()).emit("userNotificationSound", {
                    user_id: userTemp._id,
                    notification_sound:userTemp.notification_sound,
                    user_token:change._id,
                    hash:hash
                });
            }
            else if(userUpdateCheck.status){
                userTemp.company_ids.map((company_id) => {
                    io.to(company_id).emit("userStatusUpdate", {
                        user_id: userTemp._id,
                        status: userTemp.status,
                        user_token:change._id,
                        hash:hash
                    });
                });
            }
            else if(userUpdateCheck.push_notification){
                io.to(userTemp._id.toString()).emit("userPushNotification", {
                    user_id: userTemp._id,
                    push_notification:userTemp.push_notification,
                    user_token:change._id,
                    hash:hash
                });
            } 
            else if(userUpdateCheck.do_not_disturb===true || userUpdateCheck.do_not_disturb===false){
                userTemp.company_ids.map((company_id) => {
                    io.to(company_id).emit("userDoNotDisturb", {
                        user_id: userTemp._id,
                        do_not_disturb:userTemp.do_not_disturb,
                        user_token:change._id,
                        hash:hash
                    });
                });
            } 
            break;
    }
    } catch (error) {
        sendWebhookError(error, "user change stream", change);
    }
});
};

module.exports = user;