const expess = require("express");
const { getAllOfflineUsers,getAllInactiveUsers } = require("../../utils/user");
const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");
const { ConnectionStates } = require("mongoose");
const router = expess.Router();

// @route   POST api/admin
//@desc     Add TokenNumber
//@access   Private
router.post("/channelUsers", async (req, res) => {
  const { message, users,type,channel_id,team_id,company_id,channel_name,mention_users,webhooks } = req.body;
  let user_ids='';
  if(webhooks === true){
    user_ids=users;
  }
  else if(type =='direct' || type=='public' || message.includes('@channel')){
    user_ids=users;
  }
  else if(message.includes('@here')){
    user_ids=await getAllInactiveUsers(users);
  }
  else if(mention_users.length > 0){
    user_ids=mention_users;
  }
  if(user_ids=='' || user_ids==[])
    return res.json("oka");
  const configuration = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  const url = config.get("url");

  const body = JSON.stringify({ message, user_ids,company_id,team_id,channel_id,channel_name });
  try {
      const result = axios.post(url+"api/sendPush", body, configuration);
      res.json("ok");
  } catch (err) {
    console.log("Push error",err);
    sendWebhookError(error, "/channelUsers", req);
  }
});

router.get("/test",(req,res)=>{
  console.log("In test");
  res.json("hello new");
});

module.exports = router;
