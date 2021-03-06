import React, { Component } from 'react';
import { init, captureMessage } from '@sentry/browser';
import './App.css';
import { Alert, Button } from 'reactstrap';
import ReactLoading from 'react-loading';
import { connect, closeVideoCall } from './connection';

init({
 dsn: process.env.SENTRY_DSN
});

class Video extends React.Component {
  render() {
    return (
      <div className="flexChild" id="camera-container">
        <div className="camera-box">
          <video id="received_video" autoPlay />
          <video id="local_video" autoPlay muted />
        </div>

        <Button id="hangup-button" onClick={closeVideoCall.bind(this, this.props.endCall.bind(this, true))} enabled="true" outline color="primary">End Call</Button>
      </div>
    );
  }
}

class Delay extends React.Component {
  render() {
    return (
      <div>
        <h3 className="loading">
            Please wait, looking for a {this.props.opposite_party}...
        </h3>
        <ReactLoading className="spinner" type="spin" color="white" />
      </div>
    );
  }
}

class UserSelection extends React.Component {
  render() {
    return (
      <div>
        <p className="instructions" color="white">
          <span className="line" style={{ marginRight: '0.25em' }}>Talk to the other side.</span>
          <span className="line"> Choose your party below to start. </span>

        </p>
        <Button className="outer_button" onClick={this.props.onClick.bind(this, 'liberal')} outline color="primary">
          <span className="line" style={{ marginRight: '0.25em' }}>I'M A LIBERAL,</span>
          <span className="line">BRING ME A CONSERVATIVE!</span>
        </Button>
        {' '}
        <Button onClick={this.props.onClick.bind(this, 'conservative')} outline color="primary">I'M A CONSERVATIVE, BRING ME A LIBERAL!</Button>
        {' '}
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
  constructor(props) {
    super(props);
    this.state = {
      selectorIsHidden: false,
      videoIsHidden: true,
      delayIsHidden: true,
      errorIsHidden: true,
      party: null,
    };

    this.states = {
      'default': [0, 1, 1, 1],
      'delay': [1, 1, 0, 1],
      'call': [1, 0, 1, 1],
      'error': [1, 1, 1, 0],
    };

    this.endCall = this.endCall.bind(this);
  }

  setCorrectState(state){
    const state_vals = this.states[state];
    this.setState({
      selectorIsHidden: state_vals[0],
      videoIsHidden: state_vals[1],
      delayIsHidden: state_vals[2],
      errorIsHidden: state_vals[3],
    });
  }

  on_delay() {
    this.setCorrectState('delay')
  }

  on_call() {
    this.setCorrectState('call')
  }

  on_error(e) {
    // captureMessage('Error sent to Sentry: ' + e);
    this.setCorrectState('error')
    this.setState({
      error_message: e.message,
    });
  }

  startCall(party) {
    this.setState({
      party,
      opposite_party: (party === 'liberal') ? 'conservative' : 'liberal',
    });
    try {
      connect(party, this.on_delay.bind(this), this.on_call.bind(this), this.endCall.bind(this));
    } catch (e) {
      this.on_error(e);
    }
  }

  endCall() {

    this.setState({
      party: null,
      opposite_party: null,
      selectorIsHidden: false,
      videoIsHidden: true,
      delayIsHidden: true,
      errorIsHidden: true,
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Political Roulette</h1>
        </header>
        {' '}
        <div className="user_selection">
          {!this.state.selectorIsHidden && <UserSelection onClick={party => this.startCall(party)} />}
        </div>
        <div className="video">
          {!this.state.videoIsHidden && <Video endCall={this.endCall} />}
        </div>
        <div className="delay">
          {!this.state.delayIsHidden && <Delay opposite_party={this.state.opposite_party} />}
        </div>
        <div className="error">
          {!this.state.errorIsHidden && <Error error_message={this.state.error_message} />}
        </div>
      </div>
    );
  }
}

export default App;
