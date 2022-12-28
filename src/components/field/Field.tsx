
import React, { Component} from 'react'

import styles from './Field.module.css';
import FieldOverlayRoot from './svg/FieldOverlayRoot';

type Props = {
}

type State = {
}

export class Field extends Component<Props, State> {

  render() {
    return (

      <div className={styles.Container}>
        
        <FieldOverlayRoot ></FieldOverlayRoot>
      </div>
    )
  }
}

export default Field