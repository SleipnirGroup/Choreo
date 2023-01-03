
import { observer } from 'mobx-react';
import React, { Component} from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import WaypointPanel from '../sidebar/WaypointPanel';

import styles from './Field.module.css';
import FieldOverlayRoot from './svg/FieldOverlayRoot';

type Props = {
}

type State = {
}

export class Field extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  render() {
    return (

      <div className={styles.Container}>
        
        <FieldOverlayRoot ></FieldOverlayRoot>
        <WaypointPanel waypoint={this.context.model.pathlist.activePath.lowestSelectedPoint()}></WaypointPanel>
      </div>
    )
  }
}

export default observer(Field)