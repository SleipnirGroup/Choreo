import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = { rowGap: number };

type State = object;

class SwerveConfigPanel extends Component<Props, State> {
  render() {
    const config = doc.robotConfig;
    return (
      <ExpressionInputList rowGap={this.props.rowGap}>
<ExpressionInput
              title="Front Mod X"
              enabled={true}
              roundingPrecision={3}
              number={config.frontLeft.x}
              maxWidthCharacters={8}
              titleTooltip="X coordinate of front modules"
            />

            <ExpressionInput
              title="Front Left Y"
              enabled={true}
              roundingPrecision={3}
              number={config.frontLeft.y}
              maxWidthCharacters={8}
              titleTooltip="Y coordinate of front left module"
            />
            <ExpressionInput
              title="Back Mod X"
              enabled={true}
              roundingPrecision={3}
              number={config.backLeft.x}
              maxWidthCharacters={8}
              titleTooltip="X coordinate of back modules (negative)"
            />

            <ExpressionInput
              title="Back Left Y"
              enabled={true}
              roundingPrecision={3}
              number={config.backLeft.y}
              maxWidthCharacters={8}
              titleTooltip="Y coordinate of back left module"
            />
      </ExpressionInputList>
    );
  }
}
export default observer(SwerveConfigPanel);
