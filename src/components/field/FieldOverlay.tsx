import React, { Component } from 'react'
import documentManager from '../../document/DocumentManager'

type Props = {}

type State = {}

export default class FieldOverlay extends Component<Props, State> {
  state = {}
  canvasHeightMeters = documentManager.fieldConfig['field-size'][1];
  canvasWidthMeters = documentManager.fieldConfig['field-size'][0];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  constructor(props: Props) {
    super(props);
     this.canvasRef = React.createRef<HTMLCanvasElement>();

  }
  render() {
    return (
      <div><canvas ref={this.canvasRef} {...this.props}/></div>
    )
  }
}