import { autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import React, { Component, ReactNode } from 'react'
import DocumentManagerContext from '../../../document/DocumentManager'
import { IHolonomicWaypointStore } from '../../../document/DocumentModel';
import styles from './Field.module.css';
type Props = {}

type State = {updateForcer:number, heightPx: number, widthPx:number}


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
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="silver" strokeWidth="0.01"/>
                </pattern>
            </defs>
            <g transform={`matrix(1 0 0 -1 0 0)`}>
            <image href={`../../../../UntitledWaypointEditor/fields/${fieldConfig.fieldImage}`}
                width={fieldConfig.fieldImageSize[0]} height={fieldConfig.fieldImageSize[1]}
                x={-fieldConfig.fieldOffset[0]} y={-fieldConfig.fieldOffset[1]}
                transform={`matrix(1 0 0 -1 0 ${fieldConfig.fieldSize[1]})`}></image>
            <circle cx={0} cy={0} r={100000} fill='url(#grid)'></circle>
            <circle cx={0} cy={0} r={1} fill='blue'></circle>
           
            </g>
        </svg>
    )
  }
}
export default observer(FieldOverlayRoot);
