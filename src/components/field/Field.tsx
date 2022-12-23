import React, { Component} from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import FieldOverlay from './FieldOverlay';
const styles = require("./Field.module.css").default;

type PropsWithContext = {
  containerHeight: number;
  containerWidth: number;
  context:React.ContextType<typeof DocumentManagerContext>;
}
type Props = {
  containerHeight: number;
  containerWidth: number;}

type State = {shouldUpdate: boolean}

export class Field extends Component<PropsWithContext, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  mounted: boolean = false;
  state = {
    shouldUpdate: false
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

  
  constructor(props : PropsWithContext) {
    super(props);
    console.log(this.topYPerc);
    this.containerRef = React.createRef<HTMLDivElement>();
    this.backgroundRef = React.createRef<HTMLDivElement>();
    this.overlayRef = React.createRef<HTMLDivElement>();
    let fieldConfig = this.props.context.fieldConfig;
      this.topYPerc = 100 * fieldConfig['field-corners']['top-left'][1] / fieldConfig['field-image-size'][1];
      this.leftXPerc = 100* fieldConfig['field-corners']['top-left'][0] / fieldConfig['field-image-size'][0];
      
      this.bottomYPerc = 100 - (100 *fieldConfig['field-corners']['bottom-right'][1] / fieldConfig['field-image-size'][1]);
      this.rightXPerc = 100 - (100 * fieldConfig['field-corners']['bottom-right'][0] / fieldConfig['field-image-size'][0]);
      console.log(this.topYPerc);
  }
  
  handleResize() {
  }
  componentDidMount(): void {
    this.mounted = true;
    
    window.addEventListener('resize', ()=>{this.handleResize();});
    this.handleResize();
    this.forceUpdate();
  }
 
  render() {
    
    return (
      <div className={styles.Flex}>
      <div className={styles.Container} ref={this.containerRef}>
        <div className={styles.FieldBackground} ref={this.backgroundRef}
          style={
            
            {aspectRatio: `${this.context.fieldConfig['field-image-size'][0]} / ${this.context.fieldConfig['field-image-size'][1]}`,
            maxHeight:'100%',
            maxWidth:'100%',
              backgroundImage:`url('/fields/${this.context.fieldConfig["field-image"]}')`
          }}>
        {/*TODO replace this div with a FieldOverlay component*/}
        <div ref={this.overlayRef} className={styles.Overlay} style= {{
    position:'absolute', 
    top:`${this.topYPerc}%`,
    left:`${this.leftXPerc}%`,
    bottom: `${this.bottomYPerc}%`,
    right:`${this.rightXPerc}%`
  }}>
    <FieldOverlay waypoints={this.context.model.pathlist.activePath.waypoints}></FieldOverlay>
  </div>
          </div>
  </div>
  </div>
    )
  }
}
const FieldWithContext = (props: Props) => {
  const context = React.useContext(DocumentManagerContext);
  return <Field {...props} context={context}></Field>
}
export default FieldWithContext