import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../../document/DocumentModel';
import * as d3 from 'd3'
import ReactDOM from 'react-dom';
import { DragContainerElement } from 'd3';

type Props = {waypoint: IHolonomicWaypointStore, index:number}

type State = {}


const ROTATE_HANDLE_DIST = 1;
type Coordinates = {
  x:number,
  y:number}
class OverlayWaypoint extends Component<Props, State> {
  
    static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}
  bumperRef: any;
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();

  BumperBox =observer( 
    ({context, strokeColor, strokeWidthPx} : {context : React.ContextType<typeof DocumentManagerContext>, strokeColor:string, strokeWidthPx: number}) => (
        <g>
        <defs>
        <path id={this.appendIndexID('bumpers')} d={context.model.robotConfig.bumperSVGElement()}>

      </path>
      <clipPath id={this.appendIndexID('clip')}>

            <use xlinkHref={`#${this.appendIndexID('bumpers')}`}/>
        </clipPath>
      </defs>

      <use xlinkHref={`#${this.appendIndexID('bumpers')}`} clipPath={`url(#${this.appendIndexID('clip')})`} stroke={strokeColor} 
        strokeWidth={
            strokeWidthPx * context.uiState.fieldScalingFactor} fill={'transparent'} vectorEffect={'non-scaling-stroke'} />
      </g>
)
);

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
  dragPointRotate(event : any) {

    let pointerPos :Coordinates = {x:0, y:0};
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    const waypointCoordinates = this.coordsFromWaypoint();
    // calculates the difference between the current mouse position and the center line
    var angleFinal = this.calcAngleRad(
      waypointCoordinates,
      pointerPos
    );
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array

    this.props.waypoint.setHeading((angleFinal));
    
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)

  }

  dragPointTranslate(event : any) {

    let pointerPos :Coordinates = {x:0, y:0};
    pointerPos.x = event.x;
    pointerPos.y = event.y;
    

    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array

    this.props.waypoint.setX(pointerPos.x);
    this.props.waypoint.setY(pointerPos.y);
    
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)

  }
  selectWaypoint() {
    this.context.model.pathlist.activePath.selectOnly(this.props.index);
  }
  componentDidMount(){
    if (this.rootRef.current) {
      var rotateHandleDrag = d3.drag<SVGCircleElement, undefined>()
        .on('drag', (event)=>this.dragPointRotate(event))
        .on('start', ()=>this.selectWaypoint())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#rotateTarget${this.props.index}`).call(rotateHandleDrag);

      var dragHandleDrag = d3.drag<SVGCircleElement, undefined>()
        .on('drag', (event)=>this.dragPointTranslate(event))
        .on('start', ()=>this.selectWaypoint())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#dragTarget${this.props.index}`).call(dragHandleDrag);

    }
  }

  appendIndexID(id:string) : string {
    return `${id}${this.props.index}`
  }

  getBoxColor() {
    return this.props.waypoint.selected ? 'var(--select-yellow)':'var(--accent-purple)'
  }
  getDragTargetColor() : string{
    let waypoints =this.context.model.pathlist.activePath.waypoints
    let color = 'var(--accent-purple)';
    if (waypoints.length >= 2) {
      if (this.props.index == 0) {color = 'green'}
      if (this.props.index == waypoints.length - 1) {color = 'red'}
    }

    if (this.props.waypoint.selected) {color = 'var(--select-yellow)'}
    return color;
  }

  render() {
      let px = this.context.uiState.fieldScalingFactor;
      let waypoint = this.props.waypoint;
      let boxColorStr = this.getBoxColor();
      let robotConfig = this.context.model.robotConfig;
    return (
      <g ref={this.rootRef}>
        <g transform={`translate(${waypoint.x}, ${waypoint.y}) rotate(${waypoint.heading * 180 / Math.PI})`} id={this.appendIndexID("waypointGroup")}>
            <this.BumperBox context={this.context} strokeColor={boxColorStr} strokeWidthPx={3}></this.BumperBox>
           <circle cx={robotConfig.bumperLength / 2} cy={0} r={0.15 * Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)} id={this.appendIndexID("rotateTarget")} fill={boxColorStr}></circle>
           <circle cx={0} cy={0} r={0.15 * Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)} id={this.appendIndexID("dragTarget")} fill={this.getDragTargetColor()}
           onClick={()=>this.selectWaypoint()} ></circle>
            
        </g>
      </g>
       
    )
  }
}
export default observer(OverlayWaypoint);