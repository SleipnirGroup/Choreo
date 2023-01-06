import React, { Component } from 'react';
import DocumentManagerContext from '../../../document/DocumentManager';
import { observer } from 'mobx-react';


type Props = {};

type State = {};
const DRAW_BOUND = 100;
const GRID_STROKE = 0.01;

class FieldGrid extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <>
        <defs>
          <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke="silver" strokeWidth={GRID_STROKE} />
          </pattern>
        </defs>
        <circle cx={0} cy={0} r={DRAW_BOUND} fill={this.context.uiState.fieldGridView ? 'url(#grid)' : 'transparent'} style={{ pointerEvents: 'none' }}></circle>
        <line x1={0} y1={-DRAW_BOUND} x2={0} y2={DRAW_BOUND} stroke='darkgreen' strokeWidth={5 * GRID_STROKE} style={{ pointerEvents: 'none' }}></line>
        <line y1={0} x1={-DRAW_BOUND} y2={0} x2={DRAW_BOUND} stroke='darkred' strokeWidth={5 * GRID_STROKE} style={{ pointerEvents: 'none' }}></line>
      </>
    )
  }
}
export default observer(FieldGrid)