require('dotenv').config();
const express = require("express");
var cors = require("cors");
const app = express();
const https = require("https");
const mongoose = require("mongoose");
const { getAllToken } = require("./utils/token");
const { userOffline } = require("./utils/user");
const channel = require("./changeStream/channel");
const company = require("./changeStream/company");
const message = require("./changeStream/message");
const team = require("./changeStream/team");
const token = require("./changeStream/token");
const user = require("./changeStream/user");
const reminder = require("./changeStream/reminder");
const permission = require("./changeStream/permission");
const authentication = require("./listeners/authentication");
const fs = require('fs');
const resumeAfter = require("./listeners/resumeAfter");
const error = require("./changeStream/error");
const { default: axios } = require("axios");
const pushError = require("./changeStream/errorPush");
const listenerEvent = require("./changeStream/listenerEvent");

// Configuration to send request to backend
const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};

//https certificate 
const options = {
    key: fs.readFileSync('privkey.pem'),
    cert: fs.readFileSync('cert.pem'),
};


const db = process.env.MONGO_URI;
const url = process.env.URL;
const PORT = process.env.PORT || 5000;
const server = https.createServer(options, app);

//Init Middleware
app.use(cors());
app.use(express.json({ extented: false,limit: '50mb' }));


//api endpoint for push notification
app.use("/api/pushNotification", require("./routes/api/pushNotification"));
//sanitize
app.use("/api", require("./routes/api/sanitize"));

//Database Connection
mongoose.connect(process.env.DB_URI || db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
});

const connection = mongoose.connection;

//Initializing Socket.io
const io = require("socket.io")(server, {
    cors: {
        origin: "https://schat.pf.com.pk",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: "5e6"
});

/**
 * User Socket Connection
 * 1) An emit is send to the user to authenticate token.
 * 2) leaveRooms listener to remove all the rooms that user have joined.
 * 3) messageResume listener to get all the message after the resume token.
 * 4) teamLink listener to authenticate user token when user join the company by 
 * team link and send emit to already added users company and team.
 * 5) disconnecting function is called when user connection is lost.
 */
io.on("connection", (socket) => {
    console.log("socket.io connected : ", socket.id);
    console.log("ip",socket.handshake.headers['x-forwarded-for']);
    socket.ip=socket.handshake.headers['x-forwarded-for'];
    socket.emit("userAuthentication", "");
    authentication(socket, io);

    socket.on("leaveRooms", (data) => {
         for (const room of socket.rooms) {
            socket.leave(room);
        }
    });

    socket.on("messageResume", (data) => {
        console.log("in messageResume");
        if (socket.user_id)
            resumeAfter(connection, io, data);
    });

    socket.on("teamLink", async(data) => {
        try {
            let user_ids = [];
            let token = data.key;
            const body = JSON.stringify({ token });
            let result = await axios.post(url + "api/team/readLink", body, configuration);
            if (result.data.expire == false) {
                socket.to(data.company_id).emit("newUserAdded", { company_id: data.company_id, users: data.users });
                data.users.forEach((user) => {
                    user_ids.push(user._id);
                })
                let company_id = data.company_id;
                data.team_ids.map((team_id) => {
                    socket.to(team_id).emit("newUserAddedInTeam", { user_ids, team_id, company_id });
                })
            }
        } catch (err) {
            console.log("team link",err.response);
        }
    });

    socket.on("disconnecting", () => {
        console.log("socket.io disconnected: ", socket.id);
        if (socket.user_id) {
            //Sending emit to the companies that particular is offline if false is returned from removeSocket function
            userOffline(socket);
        }
    });
});

/*
Checking if the connection with database is open
then call the getAllToken function to save the token
and call the change stream functions to start listening to changes in database
*/
connection.once("open", async() => {
    console.log("MongoDB database connected");
    console.log("Setting change streams");
    await getAllToken();
    channel(connection, io);
    company(connection, io);
    message(connection, io);
    team(connection, io);
    token(connection, io);
    user(connection, io);
    error(connection, io);
    reminder(connection, io);
    permission(connection, io);
    pushError(connection, io);
    listenerEvent(connection,io);
});

server.listen(PORT, () => console.log(`Sever Started on Port ${PORT}`));