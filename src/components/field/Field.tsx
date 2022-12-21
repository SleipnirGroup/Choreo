import React, { Component, ReactNode } from 'react'
import documentManager from '../../document/DocumentManager';
import FieldOverlay from './FieldOverlay';
const styles = require("./Field.module.css").default;

type Props = {
  containerHeight: number;
  containerWidth: number;
}

type State = {shouldUpdate: boolean, containerWidth: number, containerHeight: number}

export default class Field extends Component<Props, State> {
  state = {
    shouldUpdate: false,
    containerWidth: 300,
    containerHeight: 300
  }
  image: HTMLImageElement;
  topYPerc: number = 0;
  leftXPerc :number = 0;
  bottomYPerc: number = 0;
  rightXPerc: number = 0;
  aspectRatio: number = 0;
  overlayHeightPx: number =0;
  fieldOverlayStyle = {
    position:'relative', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom:`${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`,
  }
  containerRef: React.RefObject<HTMLDivElement>;
  backgroundRef: React.RefObject<HTMLDivElement>;

  
  constructor(props : Props) {
    super(props);
    let fieldConfig = documentManager.fieldConfig;
    
    this.containerRef = React.createRef<HTMLDivElement>();
    this.backgroundRef = React.createRef<HTMLDivElement>();
    this.image = document.createElement("img");
    this.image.src = `/fields/${fieldConfig["field-image"]}`;
    this.aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
    this.topYPerc = 100 * fieldConfig['field-corners']['top-left'][1] / this.image.naturalHeight;
    this.leftXPerc = 100* fieldConfig['field-corners']['top-left'][0] / this.image.naturalWidth;
    
    this.bottomYPerc = (100 *fieldConfig['field-corners']['bottom-right'][1] / this.image.naturalHeight);
    this.rightXPerc = (100 * fieldConfig['field-corners']['bottom-right'][0] / this.image.naturalWidth);
    this.overlayHeightPx = this.bottomYPerc - this.topYPerc * this.state.containerHeight;

    
  }
  
  handleResize() {
    this.setState({
      containerWidth:this.containerRef.current?.getBoundingClientRect().width || this.props.containerWidth,
      containerHeight:this.containerRef.current?.getBoundingClientRect().height || this.props.containerHeight,
      shouldUpdate: true
    })
    console.log("resize");
    if(this.backgroundRef.current) {
      this.backgroundRef.current.style.width = `${Math.min(this.state.containerWidth, this.aspectRatio * this.state.containerHeight)}px`;
      this.backgroundRef.current.style.height = `${Math.min(this.state.containerHeight, this.state.containerWidth / this.aspectRatio)}px`;
    }
  }
  componentDidMount(): void {
    // window.addEventListener('resize', ()=>{this.handleResize();});
    // this.handleResize();
  }
 
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
      return nextState.shouldUpdate;
  }
  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    this.setState({shouldUpdate: false});
  }
  render() {
    
    console.log(this.state.containerHeight, this.state.containerWidth);
    return (
      <div className={styles.Container} ref={this.containerRef}>
        <div className={styles.FieldBackground} ref={this.backgroundRef}
          style={
            
            {aspectRatio: `${this.image.naturalWidth} / ${this.image.naturalHeight}`,
            maxHeight:'100%',
            maxWidth:'100%',
              backgroundImage:`url('/fields/${documentManager.fieldConfig["field-image"]}')`
          }}>
        {/*TODO replace this div with a FieldOverlay component*/}
        <div style= {{
    position:'absolute', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom:`${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`,
    border:'1px red'
  }}>
    <FieldOverlay></FieldOverlay>
  </div>
          </div>
  </div>
    )
  }
}