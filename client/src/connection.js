import _ from 'lodash';
import { log, log_error, reportError } from './util';
import { test_compatibility } from './compatability';

const uuidv4 = require('uuid/v4');

let connection = null;
let clientID = null;
let targetClientID = null;
const party = null;
const mediaConstraints = {
  audio: true,
  video: true,
};
let myUsername = null;
let offerer_clientID = null;
let myPeerConnection = null;
let hasAddTrack = false;
const myHostname = window.location.hostname;


export function connect(party, on_delay, on_call_start, on_call_end) {
  test_compatibility();

  const scheme = (document.location.protocol === 'https:') ? 'wss' : 'ws';

  let serverUrl = `${scheme}://${myHostname}`;
  connection = new WebSocket(serverUrl, 'json');
  connection.onopen = function (evt) {
    myUsername = clientID = uuidv4();

    sendToServer({
      type: 'invite',
      username: myUsername,
      hostname: myHostname,
      clientID,
      party,
    });
  };

  connection.onmessage = function (evt) {
    const msg = JSON.parse(evt.data);

    switch (msg.type) {
      case 'delay':
        on_delay();
        break;

      case 'peer_info':
        targetClientID = msg.peer_clientID;
        on_call_start();
        createPeerConnection(on_call_end);

        navigator.mediaDevices.getUserMedia(mediaConstraints)
          .then((localStream) => {
            document.getElementById('local_video').src = window.URL.createObjectURL(localStream);
            document.getElementById('local_video').srcObject = localStream;

            if (hasAddTrack) {
              localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
            } else {
              myPeerConnection.addStream(localStream);
            }
          })
          .catch(handleGetUserMediaError);
        break;

      case 'video-offer':
        console.log("in case video-offer");
        test_compatibility();
        on_call_start();
        handleVideoOfferMsg(msg, on_call_end);
        break;

      case 'video-answer':
        handleVideoAnswerMsg(msg);
        break;

      case 'new-ice-candidate':
        handleNewICECandidateMsg(msg);
        break;

      case 'hang-up':

        handleHangUpMsg(msg, on_call_end);
        break;

      default:
        log_error(`Unknown message received: ${msg}`);
    }
  };
}

function createPeerConnection(on_call_end) {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [{
      urls: 'stun:stun.l.google.com:19302',
    }],
  });

  hasAddTrack = (myPeerConnection.addTrack !== undefined);

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = _.bind(handleRemoveTrackEvent, null, _, on_call_end);
  myPeerConnection.oniceconnectionstatechange = _.bind(handleICEConnectionStateChangeEvent, null, _, on_call_end);
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = _.bind(handleSignalingStateChangeEvent, null, _, on_call_end);

  if (hasAddTrack) {
    myPeerConnection.ontrack = handleTrackEvent;
  } else {
    myPeerConnection.onaddstream = handleAddStreamEvent;
  }
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    sendToServer({
      type: 'new-ice-candidate',
      target: targetClientID,
      candidate: event.candidate,
      username: myUsername,
      hostname: myHostname,
      clientID,
      party,
    });
  }
}

function handleTrackEvent(event) {
  document.getElementById('received_video').srcObject = event.streams[0];
}

async function handleNegotiationNeededEvent() {
  if (myPeerConnection._negotiating === true) return;
  myPeerConnection._negotiating = true;
  try {
    const offer = await myPeerConnection.createOffer();

    await myPeerConnection.setLocalDescription(offer);

    sendToServer({
      type: 'video-offer',
      target: targetClientID,
      name: myUsername,
      sdp: myPeerConnection.localDescription,
      username: myUsername,
      hostname: myHostname,
      clientID,
      party,
    });
  } catch (e) {
    reportError(e);
  } finally {
    myPeerConnection._negotiating = false;
  }
}

function handleRemoveTrackEvent(event, on_call_end) {
  const stream = document.getElementById('received_video').srcObject;
  const trackList = stream.getTracks();

  if (trackList.length === 0) {
    closeVideoCall(on_call_end);
  }
}

function handleICEConnectionStateChangeEvent(event, on_call_end) {
  switch (myPeerConnection.iceConnectionState) {
    case 'closed':
    case 'failed':
    case 'disconnected':
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
    case 'closed':
      closeVideoCall(on_call_end);
      break;
    default:
      break;
  }
}

function handleAddStreamEvent(event) {
  document.getElementById('received_video').srcObject = event.stream;
  document.getElementById('hangup-button').disabled = false;
}

function handleGetUserMediaError(e, on_call_end) {
  log(e);
  switch (e.name) {
    case 'NotFoundError':
      alert('Unable to open your call because no camera and/or microphone'
                + 'were found.');
      break;
    case 'SecurityError':
    case 'PermissionDeniedError':
      break;
    default:
      alert(`Error opening your camera and/or microphone: ${e.message}`);
      break;
  }

  console.log("in handleGetUserMediaError, e: ");
  console.log(e);
  console.log("on_call_end: ");
  console.log(on_call_end);

  closeVideoCall(on_call_end);
}

function handleVideoOfferMsg(msg, on_call_end) {
  let localStream = null;

  offerer_clientID = msg.clientID;
  targetClientID = msg.clientID;

  createPeerConnection(on_call_end);

  const desc = new RTCSessionDescription(msg.sdp);

  myPeerConnection.setRemoteDescription(desc).then(() => navigator.mediaDevices.getUserMedia(mediaConstraints))
    .then((stream) => {
      localStream = stream;
      document.getElementById('local_video').srcObject = localStream;

      if (hasAddTrack) {
        localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
      } else {
        myPeerConnection.addStream(localStream);
      }
    })
    .then(() => myPeerConnection.createAnswer())
    .then(answer => myPeerConnection.setLocalDescription(answer))
    .then(() => {
      const msg = {
        name: myUsername,
        clientID,
        target: offerer_clientID,
        hostname: myHostname,
        type: 'video-answer',
        sdp: myPeerConnection.localDescription,
      };

      sendToServer(msg);
    })
    .catch(_.bind(handleGetUserMediaError, null, _, on_call_end));
    // .catch(handleGetUserMediaError);
}

function handleVideoAnswerMsg(msg) {
  const desc = new RTCSessionDescription(msg.sdp);
  myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

function handleNewICECandidateMsg(msg) {
  const candidate = new RTCIceCandidate(msg.candidate);

  myPeerConnection.addIceCandidate(candidate)
    .catch(reportError);
}

function handleHangUpMsg(msg, on_close) {
  closeVideoCall(on_close);
}

export function closeVideoCall(on_close) {

  
  console.log("in beginning of closeVideoCall, on_close");
  console.log(on_close);

  const remoteVideo = document.getElementById('received_video');
  const localVideo = document.getElementById('local_video');

  if (myPeerConnection) {
    myPeerConnection.onaddstream = null;
    myPeerConnection.ontrack = null;
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
  on_close();
}

function sendToServer(msg) {
  const msgJSON = JSON.stringify(msg);
  connection.send(msgJSON);
}
