import React, { Component, ReactNode } from 'react'
import FieldConfig from '../../datatypes/FieldConfig';
const styles = require("./Field.module.css").default;

type Props = {
  containerHeight: number;
  containerWidth: number;
}

type State = {fieldConfig: FieldConfig, shouldUpdate: boolean}

export default class Field extends Component<Props, State> {
  state = {
    fieldConfig: {
      "game": "Rapid React",
      "field-image": "2022-field.png",
      "field-corners": {
        "top-left": [74, 45],
        "bottom-right": [1781, 903]
      },
      "field-size": [54, 27],
      "field-unit": "foot"
    },
    shouldUpdate: true
  }
  image: HTMLImageElement;
  topYPerc: number = 0;
  leftXPerc: number = 0;
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

  constructor(props : Props) {
    super(props);
    window.addEventListener('resize', ()=>{this.setState({shouldUpdate: true});});
    this.containerRef = React.createRef<HTMLDivElement>();
    this.image = document.createElement("img");
    this.image.src = `/fields/${this.state.fieldConfig["field-image"]}`;
    this.aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
    this.topYPerc = 100 * this.state.fieldConfig['field-corners']['top-left'][1] / this.image.naturalHeight;
    this.leftXPerc = 100 * this.state.fieldConfig['field-corners']['top-left'][0] / this.image.naturalWidth;
    this.bottomYPerc = 100 - (100 *this.state.fieldConfig['field-corners']['bottom-right'][1] / this.image.naturalHeight);
    this.rightXPerc = 100 - (100 * this.state.fieldConfig['field-corners']['bottom-right'][0] / this.image.naturalWidth);    
  }
  
  componentDidMount(): void {
      this.setState({shouldUpdate: true});
  }
 
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
      return nextState.shouldUpdate;
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    this.setState({shouldUpdate: false});
  }
  
  render() {
    let containerWidth = this.containerRef.current?.getBoundingClientRect().width || this.props.containerWidth;
    let containerHeight = this.containerRef.current?.getBoundingClientRect().height || this.props.containerHeight;
    console.log(containerHeight, containerWidth);
    return (
      <div className={styles.Container} ref={this.containerRef}>
        <div className={styles.FieldBackground} 
          style={
            {backgroundImage:`url('/fields/${this.state.fieldConfig["field-image"]}')`,
            width:`min(${containerWidth}px, ${this.aspectRatio * containerHeight}px)`,
            height:`min(${containerHeight}px, ${containerWidth / this.aspectRatio}px)`
          }
          }>
        {/*TODO replace this div with a FieldOverlay component*/}
        <div style= {{
    position:'absolute', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom:`${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`,
    border:'1px red'
  }}></div>
          </div>
  </div>
    )
  }
}