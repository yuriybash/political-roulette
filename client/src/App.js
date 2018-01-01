import React, { Component } from 'react';
import './App.css';
import { Button } from 'reactstrap';
import { PageHeader } from 'reactstrap';

class Video extends React.Component{

    render() {
        return (
            <div className="flexChild" id="camera-container">
                <div className="camera-box">
                    <video id="received_video" autoPlay></video>
                    <video id="local_video" autoPlay muted></video>
                    <button id="hangup-button" onClick="hangUpCall();" disabled>
                        Hang Up
                    </button>
                </div>
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
        response: '',
        isHidden: false
    };

  toggleHidden(){
      this.setState({
          isHidden: !this.state.isHidden
      });
  }


  startCall(party){
      this.toggleHidden();
      console.log("starting call for party: ", party);
  };


  // componentDidMount() {
  //       this.callApi()
  //           .then(res => this.setState({ response: res.express }))
  //           .catch(err => console.log(err));
  //   }


  callApi = async(endpoint) => {
    const response = await fetch(endpoint);
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
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
      </div>
    );
  }
}

export default App;
