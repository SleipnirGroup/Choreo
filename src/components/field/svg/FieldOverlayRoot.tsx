import { observer } from 'mobx-react';
import React, { Component } from 'react'
import Moveable from 'react-moveable';
import DocumentManagerContext from '../../../document/DocumentManager'
import OverlayWaypoint from './OverlayWaypoint';
import FieldBackgroundImage from './FieldBackgroundImage';
import {zoom} from 'd3-zoom';
import * as d3 from 'd3'
import FieldGrid from './FieldGrid';
import FieldPathLines from './FieldPathLines';
import FieldAddOverlay from '../FieldAddOverlay';
type Props = {}

type State = {xPan:number, yPan:number, zoom:number, mouseX:number, mouseY:number}



class FieldOverlayRoot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state={
    xPan:0,
    yPan:0,
    zoom:1,
    mouseX:0,
    mouseY:0
  }
    canvasHeightMeters: number;
    canvasWidthMeters: number;
    svgRef: React.RefObject<SVGSVGElement>;
    frameRef: React.RefObject<SVGGElement>;
  constructor(props: Props) {
    super(props);
    this.svgRef = React.createRef<SVGSVGElement>();
    this.frameRef = React.createRef<SVGGElement>();
    
  }
  componentDidMount(): void {
    window.addEventListener('resize', ()=>this.handleResize());
    this.handleResize();
    let zoomBehavior = d3.zoom<SVGGElement, undefined>()
        .on("zoom", (e)=>this.zoomed(e));
    
    d3.select<SVGGElement, undefined>(this.svgRef.current!).call(zoomBehavior);
  }
  zoomed(e:any) {
    this.handleResize();
    this.setState({xPan:e.transform.x, yPan:e.transform.y, zoom:e.transform.k})
  }
  screenSpaceToFieldSpace(current: SVGSVGElement | null, {x, y}: {x:number, y:number}): {x:number,y:number} {
    if (current && current !== undefined) {
      let origin = current.createSVGPoint();
      origin.x =x; origin.y = y;
      origin = origin.matrixTransform(current.getScreenCTM()!.inverse());
      return {x: origin.x, y:-origin.y};
      }
    return {x:0, y:0};
  }
  getScalingFactor(current: SVGSVGElement | null) : number {
      if (current && current !== undefined) {
        let origin = current.createSVGPoint();
        origin.x =0; origin.y = 0;
        let zeroOne = current.createSVGPoint();
        zeroOne.x =0; zeroOne.y = 1;
        origin = origin.matrixTransform(current.getScreenCTM()!.inverse());
        zeroOne = zeroOne.matrixTransform(current.getScreenCTM()!.inverse());
        return zeroOne.y - origin.y;
        }
      return 0;
    }
 handleResize() {
    let factor = this.getScalingFactor(this.svgRef?.current);
    this.context.uiState.setFieldScalingFactor(factor);
    console.log("setting field scaling to", factor)
 }
 getMouseCoordinates(e:any) {
   let coords = d3.pointer(e, this.frameRef?.current);
   this.setState({mouseX: coords[0], mouseY: coords[1]});
   return d3.pointer(e);
 }
  render() {
    let fieldConfig= this.context.fieldConfig;
    this.canvasHeightMeters = fieldConfig.fieldImageSize[1];
    this.canvasWidthMeters = fieldConfig.fieldImageSize[0];
  
    return (
        
        <svg ref={this.svgRef} viewBox={`
            ${-fieldConfig.fieldOffset[0]}
            ${fieldConfig.fieldOffset[1]-this.canvasHeightMeters}
            ${this.canvasWidthMeters}
            ${this.canvasHeightMeters}
        `
      }
        onMouseMove={(e)=>this.getMouseCoordinates(e)}
        xmlns="http://www.w3.org/2000/svg" 
        style={{width:'100%',
                height:'100%', position:'absolute', top:0, left:0}}
                //onClick={(e)=>this.createWaypoint(e)}
          id='field-svg-container'
        >

            <g transform={`
              matrix(${this.state.zoom} 0  0 ${-this.state.zoom} ${this.state.xPan} ${this.state.yPan})`} ref={this.frameRef} id='rootFrame'>
              {/* Background */}
            <FieldBackgroundImage></FieldBackgroundImage>
            <FieldGrid></FieldGrid>
            {/* Line paths */}
            <FieldPathLines></FieldPathLines>

            {this.context.model.pathlist.activePath.waypoints.map((point, index)=>(
                <OverlayWaypoint waypoint={point} index={index}></OverlayWaypoint>)
            )} 
            <FieldAddOverlay mouseX={this.state.mouseX} mouseY={this.state.mouseY}></FieldAddOverlay>
           
            </g>
        </svg>
    )
  }
  createWaypoint(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void {
    if (e.currentTarget === e.target) {
      var coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {x:e.clientX, y:e.clientY});
      var newPoint = this.context.model.pathlist.activePath.addWaypoint();
      newPoint.setX(coords.x);
      newPoint.setY(coords.y);
    }

  }
}
export default observer(FieldOverlayRoot);


