import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';

type Props = {mouseX:number, mouseY:number}

type State = {}

class FieldAddOverlay extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  overlayRef=React.createRef<SVGCircleElement>();
  state = {}
  componentDidMount() {
      this.overlayRef.current!.addEventListener('click', ()=>{
          let waypoint = this.context.model.pathlist.activePath.addWaypoint();
          waypoint.setX(this.props.mouseX);
          waypoint.setY(this.props.mouseY);
      });
  }
  render() {
    let enabled = this.context.uiState.fieldAddMode;
    return (
        <>
        <g style={{display:(enabled) ? "block": "none"}}>
            <circle cx={0} cy={0} r={10000} ref={this.overlayRef} style={{fill:'#0000ff22'}}></circle>
            <circle cx={this.props.mouseX} cy={this.props.mouseY} r={0.3} style={{pointerEvents:'none'}}></circle>
        </g>
        </>
    )
  }
}

export default observer(FieldAddOverlay)