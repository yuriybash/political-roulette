import React, { Component } from 'react';
import './App.css';
import { Button } from 'reactstrap';
import { PageHeader } from 'reactstrap';
import ReactLoading from 'react-loading';

const uuidv4 = require('uuid/v4');


/* START WEBSOCKET-RELATED VARS */
var myHostname = window.location.hostname;
var connection = null;
var clientID = 0;

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
var targetUsername = null;      // To store username of other peer
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

function connect(party, on_delay) {

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

            // Signaling messages: these messages are used to trade WebRTC
            // signaling information during negotiations leading up to a video
            // call.

            case "video-offer":  // Invitation and offer to chat
                // handleVideoOfferMsg(msg);
                break;

            case "video-answer":  // Callee has answered our offer
                // handleVideoAnswerMsg(msg);
                break;

            case "new-ice-candidate": // A new ICE candidate has been received
                // handleNewICECandidateMsg(msg);
                break;

            case "hang-up": // The other peer has hung up the call
                // handleHangUpMsg(msg);
                break;

            // Unknown message; output to console for debugging.

            default:
                console.log("error");
                // log_error("Unknown message received:");
                // log_error(msg);
        }

    };
}

function invite(party) {
    log("Starting to prepare an invitation");
    if (myPeerConnection) {
        alert("You can't start a call because you already have one open!");
    } else {
        log("myusername: " + myUsername);
        log(" clientID: " + clientID);



    }
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
                <h3 class="please_wait">Loading...</h3>
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

      connect(party, this.on_delay.bind(this));
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