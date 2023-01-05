import { observer } from 'mobx-react'
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager'
import Slider from '@mui/material/Slider'
import IconButton from '@mui/material/IconButton'
import PlayIcon from '@mui/icons-material/PlayArrow'

type Props = {}

type State = {
  running:boolean;
}

class PathAnimationSlider extends Component<Props, State> {
  state = {
    running:false
  }
  static contextType = DocumentManagerContext;
    context!: React.ContextType<typeof DocumentManagerContext>;
  timerId:number;

  onStart(){
    this.setState({running:true})
      this.timerId = 
        window.setInterval(() => {
          if(this.context.uiState.pathAnimationTimestamp > this.context.model.pathlist.activePath.getTotalTimeSeconds()) {
            this.context.uiState.setPathAnimationTimestamp(0);
            return;
          }
          this.context.uiState.setPathAnimationTimestamp(this.context.uiState.pathAnimationTimestamp+0.05);
        }, 50);
    }
  
    onStop(){
      this.setState({running:false})
      window.clearInterval(this.timerId);
    };
  render() {
    return (
      <div style={{
        color:'white',
        gap:'1rem',
          width:'100%', height:'2rem',
          backgroundColor:'var(--background-dark-gray)',
          paddingLeft:'10px', paddingRight:'10px',
          boxSizing:'border-box',
          display:'block',
          }}>
            <span style={{
              display:(this.context.model.pathlist.activePath.generated.length >= 2 ? "flex" : "none"),
              flexDirection: 'row', width:'100%', height:'100%', gap:'10px'}}>
          <IconButton color='default' onClick={()=>{
            if(this.state.running) {
              this.onStop();
            }
            else {
              this.onStart();
            }
          }}>
            <PlayIcon></PlayIcon>
          </IconButton>
          <Slider defaultValue={0} step={0.01}
        min={0} max={this.context.model.pathlist.activePath.getTotalTimeSeconds()}
        aria-label="Default" valueLabelDisplay="auto" value={this.context.uiState.pathAnimationTimestamp}
        onChange={(e, newVal)=>this.context.uiState.setPathAnimationTimestamp((newVal as number))} 
        sx={
          
          {flexGrow:'1', width:'2',
          
          ".MuiSlider-track, .MuiSlider-thumb":{
          transition:'unset',
          WebkitTransition: 'unset'
        }}}/>
        <span style={{minWidth:'2.5rem'}}>{`${this.context.uiState.pathAnimationTimestamp.toFixed(1)} s`}</span>
        </span>
    </div>
    )
  }
}
export default observer(PathAnimationSlider)