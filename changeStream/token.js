const { addToken, removeToken } = require("../utils/token");

const token = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const token = conn
        .collection("tokens")
        .watch({ fullDocument: "updateLookup" });
    console.log("token change stream running");

    /*
    ---Listening to Tokens table---

    Case: Insert:
    When Ever any new entry is added in token table then 
    it means that some user is online in some company so
    first save that token in node local array for middleware check
    then emit the user online event to the company in which user is online.
    */
    token.on("change", (change) => {
        switch (change.operationType) {
            case "insert":
                addToken(change.fullDocument);
                break;
            case "delete":
                removeToken(change.documentKey._id);
                break;
        }
    });
};

module.exports = token;