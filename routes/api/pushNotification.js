const expess = require("express");
const { getAllOfflineUsers,getAllInactiveUsers } = require("../../utils/user");
const { default: axios } = require("axios");
const config = require("config");
const { ConnectionStates } = require("mongoose");
const router = expess.Router();

// @route   POST api/admin
//@desc     Add TokenNumber
//@access   Private
router.post("/channelUsers", async (req, res) => {
  const { message, users,type,channel_id,team_id,company_id,channel_name,mention_users,webhooks } = req.body;

  console.log("in node channel user with message request",req.body);

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

    min=Math.ceil(5000);
    max=Math.floor(10000)
    time=Math.floor(Math.random()* (max-min +1)+min);
    console.log({time});
    setTimeout(async()=>{
      console.log("sending request to send push with data",body);
      const result =await axios.post(url+"api/sendPush", body, configuration);
      console.log("push result",result.data);
      res.json("ok");
    },time);
    
  } catch (err) {
    console.log("Push error",err);
  }
});

router.get("/test",(req,res)=>{
  console.log("In test");
  res.json("hello new");
});

module.exports = router;
