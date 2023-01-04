import { observer } from 'mobx-react'
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager'
import Slider from '@mui/material/Slider'

type Props = {}

type State = {}

class PathAnimationSlider extends Component<Props, State> {
  state = {}
  static contextType = DocumentManagerContext;
    context!: React.ContextType<typeof DocumentManagerContext>;
  render() {
    return (
      <div style={{
          width:'100%', height:'2rem',
          backgroundColor:'var(--background-dark-gray)',
          position:'absolute', bottom:0,
          paddingLeft:'10px', paddingRight:'10px',
          boxSizing:'border-box',
          display:(this.context.model.pathlist.activePath.generated.length >= 2 ? "block" : "none")}}>
          <Slider defaultValue={0} step={0.01}
        min={0} max={this.context.model.pathlist.activePath.getTotalTimeSeconds()}
        aria-label="Default" valueLabelDisplay="auto" value={this.context.uiState.pathAnimationTimestamp}
        onChange={(e, newVal)=>this.context.uiState.setPathAnimationTimestamp((newVal as number))} />
    </div>
    )
  }
}
export default observer(PathAnimationSlider)