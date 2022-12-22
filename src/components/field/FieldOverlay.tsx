import { autorun, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';
import React, { Component, ReactNode } from 'react'
import DocumentManagerContext from '../../document/DocumentManager'
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
const styles = require('./Field.module.css').default;
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
      console.log("container rect undefined", this.containerRef.current);
    }
  }
  updateField() {
    return null;
  }
  selectWaypoint(index: number) {
    this.context.model.pathlist.activePath.selectOnly(index);
  }
  createWaypoint(point: IHolonomicWaypointStore, index: number) {
    
  }
  render() {
    let pathString="";
    if (this.pathRef !== undefined) {
      this.context.model.pathlist.activePath.waypoints.forEach((point, index)=>{

          pathString += `${this.mToPx(point.x)}, ${this.state.heightPx - this.mToPx(point.y)} `;

      })
    }
    return (
      <div style={{position:'relative', height:'100%', width:'100%'}} ref={this.containerRef}>
        <svg width={this.canvasWidthMeters} height={this.canvasHeightMeters}>
          <polyline points={pathString} ref={this.pathRef} style={{fill:'none', stroke:'black', strokeWidth:3}}></polyline>
        </svg>
        {
        this.context.model.pathlist.activePath.waypoints.map((point, index) => {
          let style = {
            transform: `translate(-50%, -50%) 
            translate(0px, ${this.state.heightPx}px)
              translate(
                ${this.mToPx(point.x)}px,
                ${-this.mToPx(point.y)}px)
                 rotate(${-point.heading}rad)
                 scale(${this.mToPx(1) / 100})`,
            color:``
          }
            
            return <div className={
              styles.Waypoint 
              + (point.selected ? ` ${styles.selected}` : "")
              + (point.headingConstrained ? ` ${styles.heading}` : "")
            } style={style} onClick={()=>this.selectWaypoint(index)}></div>
          })
          
       
        
        }</div>
    )
  }
}
export default observer(FieldOverlay);