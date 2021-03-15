const expess = require("express");
const { getAllOfflineUsers,getAllInactiveUsers } = require("../../utils/user");
const { default: axios } = require("axios");
const config = require("config");
const router = expess.Router();

// @route   POST api/admin
//@desc     Add TokenNumber
//@access   Private
router.post("/channelUsers", async (req, res) => {
  const { message, users,type,channel_id,team_id,company_id,channel_name,mention_users,webhooks } = req.body;
  console.log("request boday".req.body);
  let user_ids='';
  if(webhooks === true){
    user_ids=await getAllOfflineUsers(users);
  }
  else if(type =='direct' || message.includes('@channel')){
    user_ids=await getAllOfflineUsers(users);
  }
  else if(message.includes('@here')){
    user_ids=await getAllInactiveUsers(users);
  }
  else if(mention_users.length > 0){
    user_ids=await getAllOfflineUsers(mention_users);
  }
  console.log("users_ids",user_ids);
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
    const result =await axios.post(url+"api/sendPush", body, configuration);
    console.log("done");
    res.json("ok");
  } catch (err) {
    console.log(err.response.data);
  }
});

router.get("/test",(req,res)=>{
  console.log("In test");
  res.json("hello new");
});

module.exports = router;
