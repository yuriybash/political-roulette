import React, {Component} from 'react';
import './App.css';
import {Alert, Button} from 'reactstrap';
import ReactLoading from 'react-loading';
import {connect} from "./connection";

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
                        Talk to the other side. Choose your party below to start.
                </p>
                <Button onClick={this.props.onClick.bind(this, "liberal")} outline color="primary">I'M A LIBERAL, BRING ME A CONSERVATIVE!</Button>{' '}
                <Button onClick={this.props.onClick.bind(this, "conservative")} outline color="primary">I'M A CONSERVATIVE, BRING ME A LIBERAL!</Button>{' '}
            </div>
        );
    }
}

class Error extends React.Component {

    render() {
        return (
            <Alert bsStyle="warning">
                <strong>Error!</strong> Sorry, experiencing some connection problems - please try again soon.
            </Alert>
        );
    }
}

class App extends Component {

    state = {
        selectorIsHidden: false,
        videoIsHidden: true,
        delayIsHidden: true,
        errorIsHidden: true,
        party: null
    };

    on_delay(){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: true,
          delayIsHidden: false,
          errorIsHidden: true
      })
  };

  on_call(){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: false,
          delayIsHidden: true,
          errorIsHidden: true
      })
  };

  on_error(){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: true,
          delayIsHidden: true,
          errorIsHidden: false
      })
  };

  startCall(party){
      this.setState({
          party: party,
          opposite_party: (party === 'liberal') ? 'conservative' : 'liberal'
      });
      try {
          connect(party, this.on_delay.bind(this), this.on_call.bind(this));
      } catch (e) {
          this.on_error();
      }
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Conversations</h1>
        </header>
          <div className="user_selection">
              {!this.state.selectorIsHidden && <UserSelection onClick={(party) => this.startCall(party)}/>}
          </div>
          <div className="video">
              {!this.state.videoIsHidden && <Video/>}
          </div>
          <div className="delay">
              {!this.state.delayIsHidden && <Delay opposite_party={this.state.opposite_party}/>}
          </div>
          <div className="error">
              {!this.state.errorIsHidden && <Error/>}
          </div>
      </div>
    );
  }
}

export default App;
