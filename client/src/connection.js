import {log, log_error, reportError} from "./util";
import {test_compatibility} from "./compatability";
import _ from 'lodash'

const uuidv4 = require('uuid/v4');
var connection = null;
var clientID = null;
var targetClientID = null;
var party = null;
var mediaConstraints = {
    audio: true,
    video: true
};
var myUsername = null;
var offerer_clientID = null;
var myPeerConnection = null;
var hasAddTrack = false;
var myHostname = window.location.hostname;


export function connect(party, on_delay, on_call_start, on_call_end) {

    test_compatibility();

    let serverUrl;
    let scheme = ('https:' === document.location.protocol) ? 'wss' : 'ws';

    serverUrl = scheme + "://" + myHostname + ":5000";
    connection = new WebSocket(serverUrl, "json");
    connection.onopen = function (evt) {

        myUsername = clientID = uuidv4();

        sendToServer({
            type: "invite",
            username: myUsername,
            hostname: myHostname,
            clientID: clientID,
            party: party
        });

    };

    connection.onmessage = function (evt) {

        let msg = JSON.parse(evt.data);

        switch (msg.type) {

            case "delay":
                on_delay();
                break;

            case "peer_info":
                targetClientID = msg.peer_clientID;
                on_call_start();
                createPeerConnection(on_call_end);

                navigator.mediaDevices.getUserMedia(mediaConstraints)
                    .then(function (localStream) {
                        document.getElementById("local_video").src = window.URL.createObjectURL(localStream);
                        document.getElementById("local_video").srcObject = localStream;

                        if (hasAddTrack) {
                            localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
                        } else {
                            myPeerConnection.addStream(localStream);
                        }
                    })
                    .catch(handleGetUserMediaError);
                break;

            case "video-offer":  // Invitation and offer to chat
                on_call_start();
                handleVideoOfferMsg(msg, on_call_end);
                break;

            case "video-answer":  // Callee has answered our offer
                handleVideoAnswerMsg(msg);
                break;

            case "new-ice-candidate": // A new ICE candidate has been received
                handleNewICECandidateMsg(msg);
                break;

            case "hang-up": // The other peer has hung up the call

                handleHangUpMsg(msg, on_call_end);
                break;

            default:
                log_error("Unknown message received: " + msg);
        }

    };
}

function createPeerConnection(on_call_end) {

    myPeerConnection = new RTCPeerConnection({
        iceServers: [{
            "urls": "stun:stun.l.google.com:19302"
        }]
    });

    hasAddTrack = (myPeerConnection.addTrack !== undefined);

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.onremovetrack = _.bind(handleRemoveTrackEvent, null, _, on_call_end);
    myPeerConnection.oniceconnectionstatechange = _.bind(handleICEConnectionStateChangeEvent, null, _, on_call_end);
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange =  _.bind(handleSignalingStateChangeEvent, null, _, on_call_end);

    if (hasAddTrack) {
        myPeerConnection.ontrack = handleTrackEvent;
    } else {
        myPeerConnection.onaddstream = handleAddStreamEvent;
    }

}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        sendToServer({
            type: "new-ice-candidate",
            target: targetClientID,
            candidate: event.candidate,
            username: myUsername,
            hostname: myHostname,
            clientID: clientID,
            party: party,
        });
    }
}

function handleTrackEvent(event) {
    document.getElementById("received_video").srcObject = event.streams[0];
}

async function handleNegotiationNeededEvent() {
    if (myPeerConnection._negotiating === true) return;
    myPeerConnection._negotiating = true;
    try {
        const offer = await myPeerConnection.createOffer();

        await myPeerConnection.setLocalDescription(offer);

        sendToServer({
            type: "video-offer",
            target: targetClientID,
            name: myUsername,
            sdp: myPeerConnection.localDescription,
            username: myUsername,
            hostname: myHostname,
            clientID: clientID,
            party: party,
        });
    } catch (e) {
        reportError(e)
    } finally {
        myPeerConnection._negotiating = false;
    }

}

function handleRemoveTrackEvent(event, on_call_end) {
    let stream = document.getElementById("received_video").srcObject;
    let trackList = stream.getTracks();

    if (trackList.length === 0) {
        closeVideoCall(on_call_end);
    }
}

function handleICEConnectionStateChangeEvent(event, on_call_end) {
    switch (myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            closeVideoCall(on_call_end);
            break;
        default:
            break;
    }
}

function handleICEGatheringStateChangeEvent(event) {
}

function handleSignalingStateChangeEvent(event, on_call_end) {
    switch (myPeerConnection.signalingState) {
        case "closed":
            closeVideoCall(on_call_end);
            break;
        default:
            break;
    }
}

function handleAddStreamEvent(event) {
    document.getElementById("received_video").srcObject = event.stream;
    document.getElementById("hangup-button").disabled = false;
}

function handleGetUserMediaError(e, on_call_end) {
    log(e);
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    closeVideoCall(on_call_end);
}

function handleVideoOfferMsg(msg, on_call_end) {
    let localStream = null;

    offerer_clientID = msg.clientID;
    targetClientID = msg.clientID;

    createPeerConnection(on_call_end);

    let desc = new RTCSessionDescription(msg.sdp);

    myPeerConnection.setRemoteDescription(desc).then(function () {
        return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
        .then(function (stream) {
            localStream = stream;
            document.getElementById("local_video").srcObject = localStream;

            if (hasAddTrack) {
                localStream.getTracks().forEach(track =>
                    myPeerConnection.addTrack(track, localStream)
                );
            } else {
                myPeerConnection.addStream(localStream);
            }
        })
        .then(function () {
            return myPeerConnection.createAnswer();
        })
        .then(function (answer) {
            return myPeerConnection.setLocalDescription(answer);
        })
        .then(function () {
            let msg = {
                name: myUsername,
                clientID: clientID,
                target: offerer_clientID,
                hostname: myHostname,
                type: "video-answer",
                sdp: myPeerConnection.localDescription
            };

            log("Sending answer packet back to other peer");
            sendToServer(msg);
        })
        .catch(handleGetUserMediaError);
}

function handleVideoAnswerMsg(msg) {
    let desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

function handleNewICECandidateMsg(msg) {
    let candidate = new RTCIceCandidate(msg.candidate);

    myPeerConnection.addIceCandidate(candidate)
        .catch(reportError);
}

function handleHangUpMsg(msg, on_close) {
    closeVideoCall(on_close);
}

export function closeVideoCall(on_close) {
    let remoteVideo = document.getElementById("received_video");
    let localVideo = document.getElementById("local_video");

    log("Closing the call");

    if (myPeerConnection) {
        myPeerConnection.onaddstream = null;  // For older implementations
        myPeerConnection.ontrack = null;      // For newer ones
        myPeerConnection.onremovestream = null;
        myPeerConnection.onnicecandidate = null;
        myPeerConnection.oniceconnectionstatechange = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        myPeerConnection.onnotificationneeded = null;

        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        if (localVideo.srcObject) {
            localVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        remoteVideo.src = null;
        localVideo.src = null;

        myPeerConnection.close();
        myPeerConnection = null;
    }

    targetClientID = offerer_clientID = null;

    on_close()
}

function sendToServer(msg) {
    let msgJSON = JSON.stringify(msg);
    connection.send(msgJSON);
}