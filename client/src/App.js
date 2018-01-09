import React, {Component} from 'react';
import './App.css';
import {Button} from 'reactstrap';
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

    state = {
        selectorIsHidden: false,
        videoIsHidden: true,
        delayIsHidden: true
    };

    on_delay(){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: true,
          delayIsHidden: false
      })
  };

  on_call_start(){
      this.setState({
          selectorIsHidden: true,
          videoIsHidden: false,
          delayIsHidden: true
      })
  };

  toggleSelector(){
      this.setState({
          selectorIsHidden: !this.state.selectorIsHidden,
      });
  }

  startCall(party){
      this.toggleSelector();
      connect(party, this.on_delay.bind(this), this.on_call_start.bind(this));
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
              {!this.state.delayIsHidden && <Delay/>}
          </div>
      </div>
    );
  }
}

export default App;
