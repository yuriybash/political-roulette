import React, {Component} from 'react';
import './App.css';
import {Alert, Button} from 'reactstrap';
import ReactLoading from 'react-loading';
import {connect, closeVideoCall} from "./connection";

class Video extends React.Component{

    render() {
        return (
            <div className="flexChild" id="camera-container">
                <div className="camera-box">
                    <video id="received_video" autoPlay></video>
                    <video id="local_video" autoPlay muted></video>
                </div>

                <Button id="hangup-button" onClick={closeVideoCall.bind(this, this.props.endCall.bind(this, true))} enabled="true" outline color="primary">End Call</Button>
            </div>
        )
    }

}

class Delay extends React.Component {

    render() {
        return (
            <div>
                <h3 className="loading">Please wait, looking for a {this.props.opposite_party}...</h3>
                <ReactLoading className="spinner" type="spin" color="white"/>
            </div>
        )
    }
}

class UserSelection extends React.Component {

    render() {
        return (
            <div>
                <p className="instructions" color="white">
                    <span className="line" style={{marginRight: '0.25em'}}>Talk to the other side.</span>
                    <span className="line"> Choose your party below to start. </span>

                </p>
                <Button className="outer_button" onClick={this.props.onClick.bind(this, "liberal")} outline color="primary">
                    <span className="line" style={{marginRight: '0.25em'}}>I'M A LIBERAL,</span>
                    <span className="line">BRING ME A CONSERVATIVE!</span>
                </Button>{' '}
                <Button onClick={this.props.onClick.bind(this, "conservative")} outline color="primary">I'M A CONSERVATIVE, BRING ME A LIBERAL!</Button>{' '}
            </div>
        );
    }
}

class Error extends React.Component {

    render() {
        return (
            <Alert>
                {this.props.error_message}
            </Alert>
        );
    }
}

class App extends Component {

    constructor(props){
        super(props)
        this.state = {
            selectorIsHidden: false,
            videoIsHidden: true,
            delayIsHidden: true,
            errorIsHidden: true,
            party: null
        };

        this.endCall = this.endCall.bind(this);
    }

  on_delay(){
      console.log("in on_delay");
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: true,
          delayIsHidden: false,
          errorIsHidden: true
      })
  };

  on_call(){
      console.log("in on_call");

      this.setState({
          selectorIsHidden: true,
          videoIsHidden: false,
          delayIsHidden: true,
          errorIsHidden: true
      })
  };

  on_error(e){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: true,
          delayIsHidden: true,
          errorIsHidden: false,
          error_message: e
      })
  };

  startCall(party){
      console.log("starting call");
      this.setState({
          party: party,
          opposite_party: (party === 'liberal') ? 'conservative' : 'liberal'
      });
      try {
          connect(party, this.on_delay.bind(this), this.on_call.bind(this), this.endCall.bind(this));
      } catch (e) {
          this.on_error(e);
      }
  };

  endCall(self=false){
      let text = (self === true) ? "You" : "Your partner";
      alert(text + " disconnected the call");

      this.setState({
          party: null,
          opposite_party: null,
          selectorIsHidden: false,
          videoIsHidden: true,
          delayIsHidden: true,
          errorIsHidden: true
      });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Conversations</h1>
        </header> <div className="user_selection">
              {!this.state.selectorIsHidden && <UserSelection onClick={(party) => this.startCall(party)}/>}
          </div>
          <div className="video">
              {!this.state.videoIsHidden && <Video endCall={this.endCall}/>}
          </div>
          <div className="delay">
              {!this.state.delayIsHidden && <Delay opposite_party={this.state.opposite_party}/>}
          </div>
          <div className="error">
              {!this.state.errorIsHidden && <Error error_message={this.state.error_message}/>}
          </div>
      </div>
    );
  }
}

export default App;
