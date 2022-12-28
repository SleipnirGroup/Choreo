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
  startDrag() {
    this.context.model.pathlist.activePath.selectOnly(this.props.index);
  }
  dragPointRotate(event : any) {

    let pointerPos :Coordinates = {x:0, y:0};
    pointerPos.x = event.x;
    pointerPos.y = event.y;
    
    console.log(event.x, event.y)

    const waypointCoordinates = this.coordsFromWaypoint();
    console.log(waypointCoordinates, pointerPos);
    // calculates the difference between the current mouse position and the center line
    var angleFinal = this.calcAngleRad(
      waypointCoordinates,
      pointerPos
    );
    console.log(angleFinal)
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
    
    console.log(event.x, event.y)

    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array

    this.props.waypoint.setX(pointerPos.x);
    this.props.waypoint.setY(pointerPos.y);
    
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)

  }

  componentDidMount(){
    if (this.rootRef.current) {
      var rotateHandleDrag = d3.drag<SVGCircleElement, undefined>()
        .on('drag', (event)=>this.dragPointRotate(event))
        .on('start', this.startDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#rotateTarget${this.props.index}`).call(rotateHandleDrag);

      var dragHandleDrag = d3.drag<SVGCircleElement, undefined>()
        .on('drag', (event)=>this.dragPointTranslate(event))
        .on('start', this.startDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#dragTarget${this.props.index}`).call(dragHandleDrag);

    }
  }

  appendIndexID(id:string) : string {
    return `${id}${this.props.index}`
  }

  render() {
      let px = this.context.uiState.fieldScalingFactor;
      let waypoint = this.props.waypoint;
      let boxColorStr = this.props.waypoint.selected ? 'var(--select-yellow)':'var(--accent-purple)'
    return (
      <g ref={this.rootRef}>
        <g transform={`translate(${waypoint.x}, ${waypoint.y}) rotate(${waypoint.heading * 180 / Math.PI})`} id={this.appendIndexID("waypointGroup")}>
            <this.BumperBox context={this.context} strokeColor={boxColorStr} strokeWidthPx={3}></this.BumperBox>
           <circle cx={this.context.model.robotConfig.bumperLength / 2} cy={0} r={7 * px} id={this.appendIndexID("rotateTarget")} fill={boxColorStr}></circle>
           <circle cx={0} cy={0} r={7 * px} id={this.appendIndexID("dragTarget")} fill={boxColorStr}></circle>
            
        </g>
      </g>
       
    )
  }
}
export default observer(OverlayWaypoint);