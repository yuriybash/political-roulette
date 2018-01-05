import React, {Component} from 'react';
import './App.css';
import {Button, PageHeader} from 'reactstrap';
import ReactLoading from 'react-loading';
import {connect} from "./connection";


/* START WEBSOCKET-RELATED VARS */

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

// To store username of other peer
// RTCPeerConnection


// To work both with and without addTrack() we need to note
// if it's available

/*
END WEBSOCKET-RELATED VARS
 */



/* RECIPIENT RECEIVING OFFER BELOW */




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