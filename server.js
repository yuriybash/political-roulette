const express = require('express');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var WebSocketServer = require('websocket').server;

var httpsOptions = {
    key: fs.readFileSync("/Users/yuriy/create-react-app-master/conversations/key.pem"),
    cert: fs.readFileSync("/Users/yuriy/create-react-app-master/conversations/cert.pem")
};

const app = express();
var httpsServer = https.createServer(httpsOptions, app);


httpsServer.listen(6503, function(){
    log("server is listening on port 6503")
});

var connectionArray = [];
var lib_queue = [];
var con_queue = [];

function log(text){
    let time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

function originIsAllowed(origin){
    return true;
}

function sendToOneUser(target_clientID, msgString){
    let target_conn = getConnectionForID(target_clientID);
    if(target_conn){
        target_conn.sendUTF(msgString);
    }
}

function getConnectionForID(target_clientID){
    let connect = null;
    let i;

    for(i = 0; i < connectionArray.length; i++){
        if(connectionArray[i].clientID === target_clientID){
            connect = connectionArray[i];
            break;
        }
    }
    return connect;
}

var wsServer = new WebSocketServer({
    httpServer: httpsServer,
    autoAcceptConnections: false
});

wsServer.on('request', function(request){

    let connection = request.accept("json", request.origin);

    connection.on('message', function(message){
        if(message.type === 'utf8'){
            log("Received Message: " + message.utf8Data);

            let sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            let connect = getConnectionForID(msg.clientID);

            switch(msg.type){
                    case "invite":
                        console.log("received invite message, message: ", msg);
                        debugger;
                        log("Connection accepted from " + connection.remoteAddress + ".");
                        connection.clientID = msg.clientID;
                        connectionArray.push(connection);


                        let target_queue = (msg.party === 'liberal') ? con_queue : lib_queue;
                        if(!target_queue){

                            let target_queue = (msg.party === 'liberal') ? lib_queue : con_queue;
                            target_queue.concat(connection);

                            let msg = {
                                type: "delay",
                                message: "Please wait while we pair you with someone. This may take a minute."
                            };

                            sendToOneUser()
                        }

            }

            // if(sendToClients){
            //     let msgString = JSON.stringify(msg);
            //     let i;
            //
            //     if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
            //         sendToOneUser(msg.target, msgString);
            //     } else {
            //         for (i=0; i<connectionArray.length; i++) {
            //             connectionArray[i].sendUTF(msgString);
            //         }
            //     }
            // }
        }
    });

    connection.on('close', function(reason, description) {
        // First, remove the connection from the list of connections.
        connectionArray = connectionArray.filter(function(el, idx, ar) {
            return el.connected;
        });

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
