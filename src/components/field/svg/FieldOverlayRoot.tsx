import { autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import React, { Component, LegacyRef, ReactNode } from 'react'
import Moveable from 'react-moveable';
import FieldConfig from '../../../datatypes/FieldConfig';
import DocumentManagerContext from '../../../document/DocumentManager'
import { IHolonomicWaypointStore } from '../../../document/DocumentModel';
import styles from './Field.module.css';
import OverlayWaypoint from './OverlayWaypoint';
import OverlayWaypointOld from '../OverlayWaypoint';
import * as d3 from 'd3'
type Props = {}

type State = {metersPerPixel: number}

const DRAW_BOUND = 100;
const GRID_STROKE = 0.01;

const FieldBackground = ({fieldConfig} :{fieldConfig:FieldConfig}) => (<g>
    <image href={`../../../../UntitledWaypointEditor/fields/${fieldConfig.fieldImage}`}
                width={fieldConfig.fieldImageSize[0]} height={fieldConfig.fieldImageSize[1]}
                x={-fieldConfig.fieldOffset[0]} y={-fieldConfig.fieldOffset[1]}
                transform={`matrix(1 0 0 -1 0 ${fieldConfig.fieldSize[1]})`}></image>
            <circle cx={0} cy={0} r={DRAW_BOUND} fill='url(#grid)'></circle>
            <line x1={0} y1={-DRAW_BOUND} x2={0} y2={DRAW_BOUND} stroke='green' strokeWidth={5 * GRID_STROKE}></line>
            <line y1={0} x1={-DRAW_BOUND} y2={0} x2={DRAW_BOUND} stroke='red' strokeWidth={5 * GRID_STROKE}></line>
            </g>
)

class FieldOverlayRoot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state={
      metersPerPixel: 0.024
  }
    canvasHeightMeters: number;
    canvasWidthMeters: number;
    svgRef: React.RefObject<SVGSVGElement>;
    frameRef: React.RefObject<SVGGElement>;
    moveables: Array<Moveable> = new Array<Moveable>();
  constructor(props: Props) {
    super(props);
    this.svgRef = React.createRef<SVGSVGElement>();
    this.frameRef = React.createRef<SVGGElement>();
    
  }
  componentDidMount(): void {
    


    window.addEventListener('resize', ()=>this.handleResize());
    this.handleResize();
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
 }
  render() {
    let fieldConfig= this.context.fieldConfig;
    this.canvasHeightMeters = fieldConfig.fieldImageSize[1];
    this.canvasWidthMeters = fieldConfig.fieldImageSize[0];
    let pathString="";
      this.context.model.pathlist.activePath.waypoints.forEach((point, index)=>{

          pathString += `${point.x}, ${point.y} `;

      })

    let generatedPathString = "";
    this.context.model.pathlist.activePath.generated.forEach(point => {
      generatedPathString += `${point.x + 1},${point.y} `;
  })
    return (<div>
        
        <svg ref={this.svgRef} viewBox={`
            ${-fieldConfig.fieldOffset[0]}
            ${fieldConfig.fieldOffset[1]-this.canvasHeightMeters}
            ${this.canvasWidthMeters}
            ${this.canvasHeightMeters}
        `}
        xmlns="http://www.w3.org/2000/svg" 
            style={{              width:'100%',
                height:'100%'}}
        >
            <defs>
                <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="silver" strokeWidth={GRID_STROKE}/>
                </pattern>
            </defs>
            <g transform={`matrix(1 0 0 -1 0 0)`} ref={this.frameRef}>
            <FieldBackground fieldConfig={fieldConfig}></FieldBackground>
            <polyline points={pathString} stroke="black" strokeWidth={0.1} fill='transparent'></polyline>
            {this.context.model.pathlist.activePath.waypoints.map((point, index)=>(
                <OverlayWaypoint waypoint={point} index={index}></OverlayWaypoint>)
            )} 
            
           
            </g>
        </svg>
    </div>
       
    )
  }
}
export default observer(FieldOverlayRoot);


