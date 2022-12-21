import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager'

type Props = {heightpx: number, widthpx: number}

type State = {}

export default class FieldOverlay extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}
  canvasHeightMeters = this.context.fieldConfig['field-size'][1];
  canvasWidthMeters = this.context.fieldConfig['field-size'][0];
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