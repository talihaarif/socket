const expess = require("express");
const { getAllInactiveUsers } = require("../../utils/user");
const { default: axios } = require("axios");
const { sendWebhookError } = require("../../utils/webhook");
const router = expess.Router();

// @route   POST api/admin
//@desc     Add TokenNumber
//@access   Private
router.post("/channelUsers", async (req, res) => {
  const { message, users,type,channel_id,team_id,company_id,channel_name,mention_users,webhooks,message_body } = req.body;
  let user_ids='';
  let event_name='';
  mention_users.map((el)=>{
    if(!users.includes(el))
      users.push(el);
  });

  user_ids=users;
  
  if(message.includes('@here')){
    user_ids=await getAllInactiveUsers(users);
  }
  
  if(user_ids=='' || user_ids==[])
    return res.json("oka");
  const configuration = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  const url = process.env.URL;
  
  if(message_body.replying_id)
    event_name="socket_newReplyMessage";
  else
    event_name="socket_newMessage";

  const body = JSON.stringify({ message, user_ids,company_id,team_id,channel_id,channel_name,message_body,type,event_name,message_id:message_body._id,sender_id:message_body.sender_id });
  try {
      const result = axios.post(url+"api/sendPush", body, configuration);
      res.json("ok");
  } catch (err) {
    console.log("Push error",err);
    sendWebhookError(error, "/channelUsers", req);
  }
});

router.get("/test",(req,res)=>{
  res.json("hello new");
});

module.exports = router;
