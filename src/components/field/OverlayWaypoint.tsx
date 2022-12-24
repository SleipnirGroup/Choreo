import Moveable, { MoveableManagerInterface, OnDrag, Renderer } from "react-moveable";
import React, { Component} from 'react'
import { observer } from "mobx-react";
import { IHolonomicWaypointStore } from "../../document/DocumentModel";
import { autorun } from "mobx";
import DocumentManagerContext from "../../document/DocumentManager";
const styles = require('./OverlayWaypoint.module.css').default;

type Props = {waypoint:IHolonomicWaypointStore, mToPx:number, index:number}


type State = {}
interface RotatorAbleProps {
    rotatorAble:boolean,
    boxWidthPx:number
}
 class OverlayWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {}
  frame = {
    translate: [0,0],
    rotate: 0}
  moveRef= React.createRef<HTMLDivElement>();
  movableRef=React.createRef<Moveable>();
  dragTargetRef= React.createRef<HTMLSpanElement>();
  rotationTargetRef= React.createRef<HTMLSpanElement>();
  handleResize() {
    this.updateWaypoint();
  }
componentDidMount() {
    this.movableRef.current?.render();
    this.forceUpdate();
    window.addEventListener('resize', ()=>this.handleResize());
    autorun(()=>{
        this.updateWaypoint();
    })

}

RotatorAble = {
    name: "rotatorAble",
    props: {rotatorAble: Boolean, boxWidthPx:Number},
    events: {},
    render(moveable: MoveableManagerInterface<RotatorAbleProps>, React: Renderer) {
      const {
        rotation,width, height, offsetWidth
      } = moveable.getRect();
      // bounding box corners clockwise from top left
      const {
        pos1, pos2, pos3, pos4
      } = moveable.state;
  
      return <div 
        className="moveable-custom-rotation"
        key="moveable-custom-rotation"
        style= {{
          position: "absolute",
          left: `0px`,
          top: `0px`,
          background: "transparent",
          borderRadius: "50%",
          width: `${moveable.props.boxWidthPx}px`,
          height: `${moveable.props.boxWidthPx}px`,
          transformOrigin: "50% 50%",
          transform: ` translate(-50%, -50%) translate(${pos2[0]-(pos2[0] - pos4[0])/2}px, ${pos4[1]-(pos4[1] - pos2[1])/2}px) scale(0.35)`,
          cursor: "pointer",
          
        }}
    ></div>
    },
  }
    
  updateWaypoint() {
    const { x, y, heading} = this.props.waypoint;
    if(this.moveRef.current !== null) {
        this.moveRef.current.style.transform = `
        translate(-50%, -50%)
        translate(${x * this.props.mToPx}px, ${-y * this.props.mToPx}px)
        rotate(${-heading}rad)
        scale(${1 * this.props.mToPx / 100})`;
    }
    this.movableRef.current?.updateTarget();
  }

  render() {
    
    // if (this.moveRef.current){
    // if ((this.moveRef.current.style.transform.length || 0) === 0) {
    //     this.updateWaypoint();
    // }}
    return (
      <div className={styles.Container}>
        <div
            className={styles.Waypoint 
                    + (this.props.waypoint.headingConstrained ? ` ${styles.heading}`: "")
                    + (this.props.waypoint.selected ? ` ${styles.selected}`: "")
                } 
          ref={this.moveRef}
        >
        <span 
            className={styles.DragTarget}
            ref={this.dragTargetRef}
            onClick={(e)=>{e.stopPropagation(); this.context.model.pathlist.activePath.selectOnly(this.props.index)}}></span>
        <span className={styles.HeadingTarget} ref={this.rotationTargetRef}></span>
        </div>
        <Moveable
            ref={this.movableRef}
            hideDefaultLines={true}
            target={this.moveRef.current}
            rotationTarget={`.moveable-custom-rotation`}
            dragTarget={this.dragTargetRef.current}
            originDraggable={false}
            originRelative={true}
            draggable={true}
            throttleDrag={0}
            startDragRotate={0}
            throttleDragRotate={0}
            zoom={1}
            origin={false}
            padding={{"left":0,"top":0,"right":0,"bottom":0}}
            rotatable={true}
            throttleRotate={0}
            rotationPosition={"none"}
            onDragStart={e => {
                e.set([this.props.waypoint.x * this.props.mToPx, -this.props.waypoint.y * this.props.mToPx]);
            }}
            onDrag={e => {
               this.props.waypoint.setX(e.beforeTranslate[0] / this.props.mToPx);
               this.props.waypoint.setY(-e.beforeTranslate[1] / this.props.mToPx);
            }}
            onRotateStart={e => {
                e.set(-this.props.waypoint.heading * 180 / Math.PI);
            }}
            onRotate={e => {
                this.props.waypoint.setHeading(-e.beforeRotation * Math.PI / 180);
            }}
            onRender={e => {
                this.updateWaypoint();
            }}
            ables={[this.RotatorAble]}
            props={{
                rotatorAble:true,boxWidthPx:1 * this.props.mToPx}
            }        
        />
      </div>
    )
  }
}

export default observer(OverlayWaypoint);