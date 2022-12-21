import React, { Component, ReactNode } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import FieldOverlay from './FieldOverlay';
const styles = require("./Field.module.css").default;

type Props = {
  containerHeight: number;
  containerWidth: number;
}

type State = {shouldUpdate: boolean, overlayHeightPx: number, overlayWidthPx: number}

export default class Field extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {
    shouldUpdate: false,
    overlayHeightPx: 300,
    overlayWidthPx: 300
  }
  image: HTMLImageElement;
  topYPerc: number = 0;
  leftXPerc :number = 0;
  bottomYPerc: number = 0;
  rightXPerc: number = 0;
  aspectRatio: number = 0;
  fieldOverlayStyle = {
    position:'relative', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom:`${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`,
  }
  containerRef: React.RefObject<HTMLDivElement>;
  backgroundRef: React.RefObject<HTMLDivElement>;
  overlayRef: React.RefObject<HTMLDivElement>;

  
  constructor(props : Props) {
    super(props);
    console.log(this.context);
    
    this.containerRef = React.createRef<HTMLDivElement>();
    this.backgroundRef = React.createRef<HTMLDivElement>();
    this.overlayRef = React.createRef<HTMLDivElement>();    
    this.image = document.createElement("img");
  }
  
  handleResize() {
    this.setState({
      overlayWidthPx:this.overlayRef.current?.getBoundingClientRect().width || 100,
      overlayHeightPx:this.overlayRef.current?.getBoundingClientRect().height || 100,
      shouldUpdate: true
    })
  }
  componentDidMount(): void {
    let fieldConfig = this.context.fieldConfig;
    
    
    this.image.src = `/fields/${fieldConfig["field-image"]}`;
      this.image.onload= (
        (event : Event)=>{
          this.setState({shouldUpdate:true});
        }
      )

    this.topYPerc = 100 * fieldConfig['field-corners']['top-left'][1] / this.image.naturalHeight;
    this.leftXPerc = 100* fieldConfig['field-corners']['top-left'][0] / this.image.naturalWidth;
    
    this.bottomYPerc = 100 - (100 *fieldConfig['field-corners']['bottom-right'][1] / this.image.naturalHeight);
    this.rightXPerc = 100 - (100 * fieldConfig['field-corners']['bottom-right'][0] / this.image.naturalWidth);
    
    window.addEventListener('resize', ()=>{this.handleResize();});
    this.handleResize();
  }
 
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
      return nextState.shouldUpdate;
  }
  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    this.setState({shouldUpdate: false});
  }
  render() {
    
    console.log(`${this.image.naturalWidth} / ${this.image.naturalHeight}`);
    return (
      <div className={styles.FlexContainer}>
      <div className={styles.Container} ref={this.containerRef}>
        <div className={styles.FieldBackground} ref={this.backgroundRef}
          style={
            
            {aspectRatio: `${this.image.naturalWidth} / ${this.image.naturalHeight}`,
            maxHeight:'100%',
            maxWidth:'100%',
              backgroundImage:`url('/fields/${this.context.fieldConfig["field-image"]}')`
          }}>
        {/*TODO replace this div with a FieldOverlay component*/}
        <div ref={this.overlayRef} style= {{
    position:'absolute', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom: `${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`,
    background:'red'
  }}>
    <FieldOverlay heightpx={this.state.overlayHeightPx} widthpx={this.state.overlayWidthPx} ></FieldOverlay>
  </div>
          </div>
  </div>
  </div>
    )
  }
}