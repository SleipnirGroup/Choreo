
import React, { Component} from 'react'

import DocumentManagerContext from '../../document/DocumentManager';
import FieldOverlay from './FieldOverlay';
import styles from './Field.module.css';
import FieldOverlayRoot from './svg/FieldOverlayRoot';

type Props = {
}

type State = {
}

export class Field extends Component<Props, State> {
  constructor(props : Props) {
    super(props);
  }
 
  render() {
    return (
      <div className={styles.Container}>
        <FieldOverlayRoot ></FieldOverlayRoot>
      </div>
    )
  }
}

export default Field