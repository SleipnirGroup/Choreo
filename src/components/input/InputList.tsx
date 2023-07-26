import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Input from "./Input";
import styles from "./InputList.module.css";

type Props = {};

type State = {};

class InputList extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let config = this.context.model.robotConfig;
    return (
        <div className={styles.InputList}>
          {this.props.children}
        </div>
    );
  }
}
export default observer(InputList);
