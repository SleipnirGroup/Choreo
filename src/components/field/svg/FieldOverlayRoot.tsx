import { autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import React, { Component, ReactNode } from 'react'
import FieldConfig from '../../../datatypes/FieldConfig';
import DocumentManagerContext from '../../../document/DocumentManager'
import { IHolonomicWaypointStore } from '../../../document/DocumentModel';
import styles from './Field.module.css';
import OverlayWaypoint from './OverlayWaypoint';
type Props = {}

type State = {updateForcer:number, heightPx: number, widthPx:number}

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
    canvasHeightMeters: number;
    canvasWidthMeters: number;
  constructor(props: Props) {
    super(props);

    
  }
  componentDidMount(): void {
    
    this.forceUpdate();
  }
  render() {
    let fieldConfig= this.context.fieldConfig;
    this.canvasHeightMeters = fieldConfig.fieldImageSize[1];
    this.canvasWidthMeters = fieldConfig.fieldImageSize[0];
    return (
        <svg viewBox={`
            ${-fieldConfig.fieldOffset[0]}
            ${fieldConfig.fieldOffset[1]-this.canvasHeightMeters}
            ${this.canvasWidthMeters}
            ${this.canvasHeightMeters}
        `}
        xmlns="http://www.w3.org/2000/svg" 
            style={{
                pointerEvents:"none",
                width:'100%',
                height:'100%'}}
        >
            <defs>
                <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="silver" strokeWidth={GRID_STROKE}/>
                </pattern>
            </defs>
            <g transform={`matrix(1 0 0 -1 0 0)`}>
            <FieldBackground fieldConfig={fieldConfig}></FieldBackground>
            {this.context.model.pathlist.activePath.waypoints.map((point)=>(
                <OverlayWaypoint waypoint={point}></OverlayWaypoint>)
            )}
            
           
            </g>
        </svg>
    )
  }
}
export default observer(FieldOverlayRoot);
