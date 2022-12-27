import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../../document/DocumentModel'

type Props = {waypoint: IHolonomicWaypointStore}

type State = {}
const BumperBox =observer( 
    ({context} : {context : React.ContextType<typeof DocumentManagerContext>}) => (
        <g>
        <defs>
        <path id='box' d={context.model.robotConfig.bumperSVGElement()}>

      </path>
      <clipPath id="clip">

            <use xlinkHref="#box"/>
        </clipPath>
      </defs>

      <use xlinkHref="#box" clipPath="url(#clip)" stroke={'blue'} 
        strokeWidth={
            0.2 * Math.min(
                context.model.robotConfig.bumperLength,
                context.model.robotConfig.bumperWidth)} fill={'transparent'} />
      </g>
)
);
class OverlayWaypoint extends Component<Props, State> {
    static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}

  render() {
      let waypoint = this.props.waypoint;
    return (
        <g transform={`translate(${waypoint.x})`}>
            <BumperBox context={this.context}></BumperBox>
        </g>
       
    )
  }
}
export default observer(OverlayWaypoint);