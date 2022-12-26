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
    this.canvasHeightMeters = this.context.fieldConfig['field-size'][1];
    this.canvasWidthMeters = this.context.fieldConfig['field-size'][0];
    return (
        <svg viewBox={`0 ${-this.canvasHeightMeters} ${this.canvasWidthMeters} ${this.canvasHeightMeters}`}
        xmlns="http://www.w3.org/2000/svg" 
            style={{
                pointerEvents:"none",
                width:'100%',
                height:'100%',
                aspectRatio: `${this.canvasWidthMeters} / ${this.canvasHeightMeters}`}}
        >
            <g transform={`matrix(1 0 0 -1 0 0)`}>

            <rect x="0" y={0} width="100%" height="100%" fill="black" transform='rotate(10)'/>
            <circle cx={0} cy={0} r={1} fill='blue'></circle>
            <circle cx={0} cy={10} r={1} fill='blue'></circle>
            </g>
        </svg>
    )
  }
}
export default observer(FieldOverlayRoot);
