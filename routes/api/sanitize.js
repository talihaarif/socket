const expess = require("express");
const sanitizeHtml = require('sanitize-html');
const router = expess.Router();


router.post("/sanitizeMessage", async (req, res) => {
    try{
        let html = req.body.message;
        console.log(html);
        html = sanitizeHtml(html,{allowedAttributes: {
            'span': [ 'class','data-mention-id' ]
        },});
        return res.json(html);
    } catch(err) {
        return res.json({message: err});
    } 
});

module.exports = router;
