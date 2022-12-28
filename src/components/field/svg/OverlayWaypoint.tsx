import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../../document/DocumentModel';
import * as d3 from 'd3'
import ReactDOM from 'react-dom';
import { DragContainerElement } from 'd3';

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
            10 * context.uiState.fieldScalingFactor} fill={'transparent'} vectorEffect={'non-scaling-stroke'} />
      </g>
)
);

const ROTATE_HANDLE_DIST = 1;
type Coordinates = {
  x:number,
  y:number}
class OverlayWaypoint extends Component<Props, State> {
  
    static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}
  rotateHandleStartPos : Coordinates = {x: this.props.waypoint.x, y: this.props.waypoint.y };
  bumperRef: any;
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();

  rotate (event:any) {
    this.dragPointRotate(event, this.rotateHandleStartPos)
  }

  getElementCenter () {

    return {
      x: this.props.waypoint.x,
      y: this.props.waypoint.y,
    }
  }

  // gets the angle in degrees between two points
  calcAngleRad(p1:Coordinates, p2:Coordinates) {
    var p1x = p1.x;
    var p1y = p1.y;
    return (Math.atan2(p2.y - p1y, p2.x - p1x));
  }

  coordsFromWaypoint() : Coordinates {
    return {
      x:this.props.waypoint.x,
      y:this.props.waypoint.y
    }
  }
  dragPointRotate(event : any, rotateHandleStartPos : Coordinates) {

    rotateHandleStartPos.x = event.x;
    rotateHandleStartPos.y = event.y;
    console.log(event.x, event.y)

    const waypointCoordinates = this.coordsFromWaypoint();
    console.log(waypointCoordinates, rotateHandleStartPos);
    // calculates the difference between the current mouse position and the center line
    var angleFinal = this.calcAngleRad(
      waypointCoordinates,
      rotateHandleStartPos
    );
    console.log(angleFinal)
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array

    this.props.waypoint.setHeading((angleFinal));
    
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)

  }

  componentDidMount(){
    if (this.rootRef.current) {
      var drag = d3.drag<SVGCircleElement, undefined>()
      .on('drag', (event)=>this.rotate(event)).container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#rotateTarget`).call(drag);
    }
  }

  render() {
      let waypoint = this.props.waypoint;
    return (
      <g id='root' ref={this.rootRef}>
        <g transform={`translate(${waypoint.x}, ${waypoint.y}) rotate(${waypoint.heading * 180 / Math.PI})`} id='group'>
            <BumperBox context={this.context}></BumperBox>
           <circle cx={1} cy={0} r={0.2} id='rotateTarget'></circle>
            
        </g>
        </g>
       
    )
  }
}
export default observer(OverlayWaypoint);