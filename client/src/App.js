import React, { Component } from 'react';
import './App.css';
import { Button } from 'reactstrap';
import { PageHeader } from 'reactstrap';
import ReactLoading from 'react-loading';

const uuidv4 = require('uuid/v4');


/* START WEBSOCKET-RELATED VARS */
var myHostname = window.location.hostname;
var connection = null;
var clientID = null;
var targetClientID = null;
var party = null;

// The media constraints object describes what sort of stream we want
// to request from the local A/V hardware (typically a webcam and
// microphone). Here, we specify only that we want both audio and
// video; however, you can be more specific. It's possible to state
// that you would prefer (or require) specific resolutions of video,
// whether to prefer the user-facing or rear-facing camera (if available),
// and so on.
//
// See also:
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
//

var mediaConstraints = {
    audio: true,            // We want an audio track
    video: true             // ...and we want a video track
};

var myUsername = null;
var offerer_clientID = null;      // To store username of other peer
var myPeerConnection = null;    // RTCPeerConnection


// To work both with and without addTrack() we need to note
// if it's available

var hasAddTrack = false;

/*
END WEBSOCKET-RELATED VARS
 */



/* START WSS CODE */
function log(text) {
    var time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

function log_error(text) {
    var time = new Date();

    console.error("[" + time.toLocaleTimeString() + "] " + text);
}

function reportError(errMessage) {
    log_error("Error " + errMessage.name + ": " + errMessage.message);
}

function connect(party, on_delay, on_call_start) {

    var serverUrl;
    var scheme = "wss";

    serverUrl = scheme + "://" + myHostname + ":6503";
    connection = new WebSocket(serverUrl, "json");
    connection.onopen = function(evt) {
        console.log("opened websocket connection");

        myUsername = clientID = uuidv4();
        log("set username and clientID to: " + myUsername);

        sendToServer({
            type: "invite",
            username: myUsername,
            hostname: myHostname,
            clientID: clientID,
            party: party
        });

    };

    connection.onmessage = function(evt) {

        console.log("received message via websockets");

        console.log("evt: ", evt);
        var msg = JSON.parse(evt.data);
        log("message received: " + msg);

        switch(msg.type) {
            // case "id":
            //     clientID = msg.id;
            //     // setUsername();
            //     break;

            case "delay":
                console.log("sorry, you have to wait!");
                on_delay();
                break;

            case "peer_info":
                console.log("peer info received, my clientID: ", clientID, " peer clientID: ", msg.peer_clientID);
                targetClientID = msg.peer_clientID;
                on_call_start();
                createPeerConnection();

                navigator.mediaDevices.getUserMedia(mediaConstraints)
                    .then(function(localStream) {
                        log("-- Local video stream obtained");
                        document.getElementById("local_video").src = window.URL.createObjectURL(localStream);
                        document.getElementById("local_video").srcObject = localStream;

                        if (hasAddTrack) {
                            log("-- Adding tracks to the RTCPeerConnection");
                            localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
                        } else {
                            log("-- Adding stream to the RTCPeerConnection");
                            myPeerConnection.addStream(localStream);
                        }
                    })
                    .catch(handleGetUserMediaError);
                break;

            // Signaling messages: these messages are used to trade WebRTC
            // signaling information during negotiations leading up to a video
            // call.

            case "video-offer":  // Invitation and offer to chat
                on_call_start();
                handleVideoOfferMsg(msg);
                break;

            case "video-answer":  // Callee has answered our offer
                handleVideoAnswerMsg(msg);
                break;

            case "new-ice-candidate": // A new ICE candidate has been received
                handleNewICECandidateMsg(msg);
                break;

            case "hang-up": // The other peer has hung up the call
                handleHangUpMsg(msg);
                break;

            // Unknown message; output to console for debugging.

            default:
                console.log("error, unknown message received client-side");
                // log_error("Unknown message received:");
                // log_error(msg);
        }

    };
}

function createPeerConnection(){

    myPeerConnection = new RTCPeerConnection({
        iceServers: [{
            "urls": "stun:stun.l.google.com:19302"
        }]
    });

    hasAddTrack = (myPeerConnection.addTrack !== undefined);

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.onremovetrack = handleRemoveTrackEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;

    if (hasAddTrack) {
        myPeerConnection.ontrack = handleTrackEvent;
    } else {
        myPeerConnection.onaddstream = handleAddStreamEvent;
    }

}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        log("Outgoing ICE candidate: " + event.candidate.candidate);

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
    log("*** Track event");
    document.getElementById("received_video").srcObject = event.streams[0];
    document.getElementById("hangup-button").disabled = false;
}

function handleNegotiationNeededEvent() {
    log("*** Negotiation needed");

    log("---> Creating offer");
    myPeerConnection.createOffer().then(function(offer) {
        log("---> Creating new description object to send to remote peer");
        return myPeerConnection.setLocalDescription(offer);
    })
        .then(function() {
            log("---> Sending offer to remote peer");
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
        })
        .catch(reportError);
}

function handleRemoveTrackEvent(event) {
    let stream = document.getElementById("received_video").srcObject;
    let trackList = stream.getTracks();

    if (trackList.length === 0) {
        closeVideoCall();
    }
}

function handleICEConnectionStateChangeEvent(event) {
    log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

    switch(myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            closeVideoCall();
            break;
    }
}

function handleICEGatheringStateChangeEvent(event) {
    log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
}

function handleSignalingStateChangeEvent(event) {
    log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
    switch(myPeerConnection.signalingState) {
        case "closed":
            closeVideoCall();
            break;
    }
}


function handleAddStreamEvent(event) {
    log("*** Stream added");
    document.getElementById("received_video").srcObject = event.stream;
    document.getElementById("hangup-button").disabled = false;
}

function handleGetUserMediaError(e) {
    log(e);
    switch(e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            // Do nothing; this is the same as the user canceling the call.
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    // Make sure we shut down our end of the RTCPeerConnection so we're
    // ready to try again.

    closeVideoCall();
}



/* RECIPIENT RECEIVING OFFER BELOW */

function handleVideoOfferMsg(msg) {
    let localStream = null;

    offerer_clientID = msg.clientID;

    // Call createPeerConnection() to create the RTCPeerConnection.

    log("Starting to accept invitation from " + offerer_clientID);
    createPeerConnection();

    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.

    let desc = new RTCSessionDescription(msg.sdp);

    myPeerConnection.setRemoteDescription(desc).then(function () {
        log("Setting up the local media stream...");
        return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
        .then(function(stream) {
            log("-- Local video stream obtained");
            localStream = stream;
            document.getElementById("local_video").src = window.URL.createObjectURL(localStream);
            document.getElementById("local_video").srcObject = localStream;

            if (hasAddTrack) {
                log("-- Adding tracks to the RTCPeerConnection");
                localStream.getTracks().forEach(track =>
                    myPeerConnection.addTrack(track, localStream)
                );
            } else {
                log("-- Adding stream to the RTCPeerConnection");
                myPeerConnection.addStream(localStream);
            }
        })
        .then(function() {
            log("------> Creating answer");
            // Now that we've successfully set the remote description, we need to
            // start our stream up locally then create an SDP answer. This SDP
            // data describes the local end of our call, including the codec
            // information, options agreed upon, and so forth.

            return myPeerConnection.createAnswer();
        })
        .then(function(answer) {
            log("------> Setting local description after creating answer");
            // We now have our answer, so establish that as the local description.
            // This actually configures our end of the call to match the settings
            // specified in the SDP.
            return myPeerConnection.setLocalDescription(answer);
        })
        .then(function() {
            let msg = {
                name: myUsername,
                clientID: clientID,
                target: offerer_clientID,
                hostname: myHostname,
                type: "video-answer",
                sdp: myPeerConnection.localDescription
            };

            // We've configured our end of the call now. Time to send our
            // answer back to the caller so they know that we want to talk
            // and how to talk to us.

            log("Sending answer packet back to other peer");
            sendToServer(msg);
        })
        .catch(handleGetUserMediaError);
}


function handleVideoAnswerMsg(msg) {
    log("Call recipient has accepted our call");

    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.

    let desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection.setRemoteDescription(desc).catch(reportError);
}


function handleNewICECandidateMsg(msg) {
    let candidate = new RTCIceCandidate(msg.candidate);

    log("Adding received ICE candidate: " + JSON.stringify(candidate));
    myPeerConnection.addIceCandidate(candidate)
        .catch(reportError);
}


function handleHangUpMsg(msg) {
    log("*** Received hang up notification from other peer");

    closeVideoCall();
}




function closeVideoCall() {
    var remoteVideo = document.getElementById("received_video");
    var localVideo = document.getElementById("local_video");

    log("Closing the call");

    // Close the RTCPeerConnection

    if (myPeerConnection) {
        log("--> Closing the peer connection");

        // Disconnect all our event listeners; we don't want stray events
        // to interfere with the hangup while it's ongoing.

        myPeerConnection.onaddstream = null;  // For older implementations
        myPeerConnection.ontrack = null;      // For newer ones
        myPeerConnection.onremovestream = null;
        myPeerConnection.onnicecandidate = null;
        myPeerConnection.oniceconnectionstatechange = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        myPeerConnection.onnotificationneeded = null;

        // Stop the videos

        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        if (localVideo.srcObject) {
            localVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        remoteVideo.src = null;
        localVideo.src = null;

        // Close the peer connection

        myPeerConnection.close();
        myPeerConnection = null;
    }

    // Disable the hangup button

    document.getElementById("hangup-button").disabled = true;

    targetClientID = offerer_clientID = null;
}


function sendToServer(msg) {
    let msgJSON = JSON.stringify(msg);
    console.log("Sending '" + msg.type + "' message: " + msgJSON);
    connection.send(msgJSON);
}

/* END WSS CODE */





/* APP CODE */
class Video extends React.Component{

    hangUpCall(){
        console.log("hanging up")
    };

    render() {
        return (
            <div className="flexChild" id="camera-container">
                <div className="camera-box">
                    <video id="received_video" autoPlay></video>
                    <video id="local_video" autoPlay muted></video>
                    <button id="hangup-button" onClick={this.hangUpCall} disabled>
                        Hang Up
                    </button>
                </div>
            </div>
        )
    }

}

class Delay extends React.Component {

    render() {
        return (
            <div>
                <h3 className="please_wait">Please wait, looking for a conservative</h3>
                <ReactLoading type="cylon" color="white" height={'60%'} width={'60%'} />
            </div>
        )
    }
}

class UserSelection extends React.Component {

    render() {
        return (
            <div>
                <Button onClick={this.props.onClick.bind(this, "liberal")} outline color="primary">I'M A LIBERAL, BRING ME A CONSERVATIVE!</Button>{' '}
                <Button onClick={this.props.onClick.bind(this, "conservative")} outline color="primary">I'M A CONSERVATIVE, BRING ME A LIBERAL!</Button>{' '}
            </div>
        );
    }
}

class App extends Component {

  on_delay(){
      this.setState({
          isHidden: true,
          videoIsHidden: true,
          delayIsHidden: false
      })
  };

  on_call_start(){
      this.setState({
          isHidden: true,
          videoIsHidden: false,
          delayIsHidden: true
      })
  };

  state = {
        response: '',
        isHidden: false,
        videoIsHidden: true,
        delayIsHidden: true
    };

  toggleHidden(){
      this.setState({
          isHidden: !this.state.isHidden,
          // videoIsHidden: !this.state.videoIsHidden
      });
  }

  startCall(party){
      this.toggleHidden();
      console.log("starting call for party: ", party);

      connect(party, this.on_delay.bind(this), this.on_call_start.bind(this));
      // invite(party);





  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Conversations</h1>
        </header>
          <div className="user_selection">
              {!this.state.isHidden && <UserSelection onClick={(party) => this.startCall(party)}/>}
          </div>
          <div className="video">
              {!this.state.videoIsHidden && <Video/>}
          </div>
          <div className="delay">
              {!this.state.delayIsHidden && <Delay/>}
          </div>
      </div>
    );
  }
}

export default App;

/* END APP CODE */