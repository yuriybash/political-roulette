var connectionArray = [], lib_queue = [], con_queue = [];

function sendToOneUser(target_clientID, msgString){
    let target_conn = getConnectionForID(target_clientID);
    if(target_conn){
        target_conn.sendUTF(msgString);
    }
}

function getConnectionForID(target_clientID){
    let connect = null;

    for(let i = 0; i < connectionArray.length; i++){
        if(connectionArray[i].clientID === target_clientID){
            connect = connectionArray[i];
            break;
        }
    }
    return connect;
}

function handle_request(request){

    let connection = request.accept("json", request.origin);

    connection.on('message', function(message){
        if(message.type === 'utf8'){
            let msg = JSON.parse(message.utf8Data);
            switch(msg.type){
                case "invite":

                    connection.clientID = msg.clientID;
                    connectionArray.push(connection);

                    let target_queue = (msg.party === 'liberal') ? con_queue : lib_queue;
                    let outgoing_msg = {};

                    if(target_queue.length < 1){

                        let self_queue = (msg.party === 'liberal') ? lib_queue : con_queue;
                        self_queue.push(connection);

                        outgoing_msg = {
                            type: "delay",
                            message: "Please wait while we pair you with someone. This may take a minute."
                        };

                    } else {
                        let peer = target_queue.shift();

                        outgoing_msg = {
                            type: "peer_info",
                            peer_clientID: peer.clientID
                        };
                    }
                    sendToOneUser(connection.clientID, JSON.stringify(outgoing_msg));
                    break;
                default:
                    sendToOneUser(msg.target, JSON.stringify(msg));
            }

        }
    });

    connection.on('close', function(reason, description) {

        let disconnected = [];
        connectionArray = connectionArray.filter(function(el, idx, ar) {
            if(!el.connected){
                disconnected.push(el.clientID)
            }
            return el.connected;
        });
        lib_queue = lib_queue.filter(function(el, idx, ar){
            return !disconnected.includes(el.clientID)
        });
        con_queue= con_queue.filter(function(el, idx, ar){
            return !disconnected.includes(el.clientID)
        });


        let logMessage = `Connection closed: ${connection.remoteAddress} (${reason}`;
        if (description !== null && description.length !== 0) {
            logMessage += ": " + description;
        }
        console.log(`[${new Date().toLocaleTimeString()}] ${logMessage})`);
    });

}

module.exports = handle_request;
