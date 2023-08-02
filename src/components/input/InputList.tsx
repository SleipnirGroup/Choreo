import { observer } from "mobx-react";
import React, { Component, PropsWithChildren } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./InputList.module.css";

type Props = { noCheckbox?: boolean };

type State = {};

class InputList extends Component<PropsWithChildren<Props>, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let className =
      styles.InputList +
      " " +
      (this.props.noCheckbox ?? false ? styles.NoCheckbox : "");
    return <div className={className}>{this.props.children}</div>;
  }
}
export default observer(InputList);
