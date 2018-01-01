const express = require('express');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var WebSocketServer = require('websocket').server;

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

function log(text){
    let time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

function originIsAllowed(origin){
    return true;
}

function isUsernameUnique(name){
    let isUnique = true;
    let i;

    for(i = 0; i < connectionArray.length; i++){
        if(connectionArray[i].username == name){
            isUnique = false;
            break;
        }
    }

    return isUnique;
}

function sendToOneUser(target, msgString){
    let isUnique = true;
    let i;

    for(i = 0; i < connectionArray.length; i++){
        if(connectionArray[i].username == name){
            connectionArray[i].sendUTF(msgString);
            break;
        }
    }
}

function getConnectionForID(id){
    let connect = null;
    let i;

    for(i = 0; i < connectionArray.length; i++){
        if(connectionArray[i].clientID === id){
            connect = connectionArray[i];
            break;
        }
    }
    return connect;
}


function makeUserListMessage(){
    let userListMsg = {
        type: "userlist",
        users: []
    };

    let i;

    for(i = 0; i < connectionArray.length; i++){
        userListMsg.users.push(connectionArray[i].username);
    }
    return userListMsg;
}


function sendUserListToAll(){
    let userListMsg = makeUserListMessage();
    let userListMsgStr = JSON.stringify(userListMsg);
    let i;

    for(i = 0; i < connectionArray.length; i++){
        connectionArray[i].sendUTF(userListMsgStr);
    }
}

var httpsOptions = {
    key: fs.readFileSync("/Users/yuriy/create-react-app-master/conversations/mdn.key"),
    cert: fs.readFileSync("/Users/yuriy/create-react-app-master/conversations/mdn.crt")
};

const app = express();
var httpServer = http.createServer(app);
var httpsServer = https.createServer(httpsOptions, app);



app.get('/api/hello', (req, res) => {
    console.log("sending response!");
    res.send({express: 'Hello from Express!!'});
});


httpsServer.listen(5000, function(){
    log("server is listening on port 5000")
});

var wsServer = new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: false
});

wsServer.on('request', function(request){

    let connection = request.accept("json", request.origin);
    log("Connection accepted from " + connection.remoteAddress + ".");

    connectionArray.push(connection);

    connection.clientID = nextID;
    nextID++;

    let msg = {
        type: "id",
        id: connection.clientID
    };
    connection.sendUTF(JSON.stringify(msg));

    connection.on('message', function(message){
        if(message.type === 'utf8'){
            log("Received Message: " + message.utf8Data);

            let sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            let connect = getConnectionForID(msg.id);

            switch(msg.type){
                case "message":
                    msg.name = connect.username;
                    msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
                    break;
                case "username":
                    var nameChanged = false;
                    var origName = msg.name;

                    while(!isUsernameUnique(msg.name)){
                        msg.name = origName + appendToMakeUnique;
                        appendToMakeUnique++;
                        nameChanged = true;
                    }

                    if(nameChanged){
                        var changeMsg = {
                            id: msg.id,
                            type: "rejectusername",
                            name: msg.name
                        };
                        connect.sendUTF(JSON.stringify(msg));
                    };

                    connect.username = msg.name;
                    sendUserListToAll();
                    sendToClients = false;
                    break;
            }

            if(sendToClients){
                let msgString = JSON.stringify(msg);
                let i;

                if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
                    sendToOneUser(msg.target, msgString);
                } else {
                    for (i=0; i<connectionArray.length; i++) {
                        connectionArray[i].sendUTF(msgString);
                    }
                }
            }
        }
    });

    connection.on('close', function(reason, description) {
        // First, remove the connection from the list of connections.
        connectionArray = connectionArray.filter(function(el, idx, ar) {
            return el.connected;
        });

        // Now send the updated user list. Again, please don't do this in a
        // real application. Your users won't like you very much.
        sendUserListToAll();

        // Build and output log output for close information.

        var logMessage = "Connection closed: " + connection.remoteAddress + " (" +
            reason;
        if (description !== null && description.length !== 0) {
            logMessage += ": " + description;
        }
        logMessage += ")";
        log(logMessage);
    });

});
