import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager.ts";
import ExpressionInput from "../../input/ExpressionInput.ts";
import ExpressionInputList from "../../input/ExpressionInputList.ts";

type Props = { rowGap: number };

type State = object;

class SwerveConfigPanel extends Component<Props, State> {
  render() {
    const config = doc.robotConfig;
    return (
      <ExpressionInputList rowGap={this.props.rowGap}>
        <ExpressionInput
          title="Trackwidth"
          enabled={true}
          roundingPrecision={3}
          number={config.differentialTrackWidth}
          maxWidthCharacters={8}
          titleTooltip="Distance between wheel sides"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(SwerveConfigPanel);
