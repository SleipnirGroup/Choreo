import { observer } from "mobx-react";
import React, { Component, PropsWithChildren } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./InputList.module.css";

type Props = {
  noCheckbox?: boolean;
  rowGap?: number;
  style?: React.CSSProperties;
};

type State = object;

class InputList extends Component<PropsWithChildren<Props>, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    const className =
      styles.InputList +
      " " +
      (this.props.noCheckbox ?? false ? styles.NoCheckbox : "");
    const rowGap = this.props.rowGap ?? 0;
    return (
      <div className={className} style={{ rowGap, ...this.props.style }}>
        {this.props.children}
      </div>
    );
  }
}
export default observer(InputList);
