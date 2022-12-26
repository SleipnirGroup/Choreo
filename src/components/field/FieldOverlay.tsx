import { autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import React, { Component, ReactNode } from 'react'
import DocumentManagerContext from '../../document/DocumentManager'
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import OverlayWaypoint from './OverlayWaypoint';
import styles from './Field.module.css';
type Props = {waypoints:Array<IHolonomicWaypointStore>}

type State = {updateForcer:number, heightPx: number, widthPx:number}


class FieldOverlay extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {updateForcer:Math.random(), heightPx:0, widthPx:0};
  canvasHeightMeters:number = 0;
  canvasWidthMeters:number = 0;
  containerRef: React.RefObject<HTMLDivElement>;
  pathRef: React.RefObject<SVGPolylineElement>;
  updaterAutorun!: IReactionDisposer ;
  fieldWaypoints: Array<ReactNode>;
  constructor(props: Props) {
    super(props);
    this.fieldWaypoints = new Array<ReactNode>();
    this.containerRef = React.createRef<HTMLDivElement>();
    this.pathRef = React.createRef<SVGPolylineElement>();
  }
  mToPx = (m: number) => m * this.state.widthPx / this.canvasWidthMeters;
  pxToM = (px: number) => px * this.canvasWidthMeters / this.state.widthPx;
  componentDidMount(): void {
    this.canvasHeightMeters = this.context.fieldConfig['field-size'][1];
    this.canvasWidthMeters = this.context.fieldConfig['field-size'][0];
    window.addEventListener('resize', ()=>{this.handleResize();});
    this.handleResize();
    this.updaterAutorun = autorun(()=>this.updateField());

  }
  handleResize() {
    let containerRect: DOMRect | undefined = this.containerRef.current?.getBoundingClientRect();
    if (containerRect !== undefined) {
      this.setState({
        updateForcer: Math.random(),
        heightPx: containerRect.height,
        widthPx: containerRect.width
      });
    } else {
      console.log("container rect undefined");
    }
  }
  updateField() {
    return null;
  }
  selectWaypoint(index: number) {
    this.context.model.pathlist.activePath.selectOnly(index);
  }
  render() {
    
    let pathString="";
      this.context.model.pathlist.activePath.waypoints.forEach((point, index)=>{

          pathString += `${point.x}, ${this.canvasHeightMeters - point.y} `;

      })

    let generatedPathString = "";
    this.context.model.pathlist.activePath.generated.forEach(point => {
      generatedPathString += `${point.x + 1},${this.canvasHeightMeters - point.y} `;
  })
    return (
      <div 
        style={{
          position:'relative',
          height:'100%',
          width:'100%'}} 
        ref={this.containerRef}
        onClick={
          (e)=>{
            e.stopPropagation();
            var rect = e.currentTarget.getBoundingClientRect();
            var x = e.clientX - rect.left; //x position within the element.
            var y = e.clientY - rect.top;  //y position within the element.
            let point = this.context.model.pathlist.activePath.addWaypoint();
            point.setX(this.pxToM(x));
            point.setY(this.canvasHeightMeters - this.pxToM(y));

          }}>
        <svg viewBox={`0 0 ${this.canvasWidthMeters} ${this.canvasHeightMeters}`} style={{pointerEvents:"none"}}>
          <polyline points={pathString} style={{fill:'none', stroke:'black', strokeWidth:0.1}}></polyline>
        </svg>
        <svg viewBox={`0 0 ${this.canvasWidthMeters} ${this.canvasHeightMeters}`} style={{pointerEvents:"none"}}>
          <polyline points={generatedPathString} style={{fill:'none', stroke:'blue', strokeWidth:0.1}}></polyline>
        </svg>
        {
        this.context.model.pathlist.activePath.waypoints.map((point, index) => {
            return <OverlayWaypoint mToPx={this.mToPx(1)} waypoint={point} index={index}></OverlayWaypoint>
          })
          
       
        
        }</div>
    )
  }
}
export default observer(FieldOverlay);
