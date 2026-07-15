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
    const frontLeft = config.wheels[0];
    const backLeft = config.wheels[1];
    const backRight = config.wheels[2];
    const frontRight = config.wheels[3];
    return (

      // front: X positive, back: X negative
      // left: Y positive, right: Y negative
      <ExpressionInputList rowGap={this.props.rowGap}>
        <ExpressionInput
          title="Front Left X"
          enabled={true}
          roundingPrecision={3}
          number={frontLeft.x}
          maxWidthCharacters={8}
          titleTooltip="X coordinate of front left module (positive)"
        />

        <ExpressionInput
          title="Front Left Y"
          enabled={true}
          roundingPrecision={3}
          number={frontLeft.y}
          maxWidthCharacters={8}
          titleTooltip="Y coordinate of front left module (positive)"
        />
        <ExpressionInput
          title="Back Left X"
          enabled={true}
          roundingPrecision={3}
          number={backLeft.x}
          maxWidthCharacters={8}
          titleTooltip="X coordinate of back left module (negative)"
        />

        <ExpressionInput
          title="Back Left Y"
          enabled={true}
          roundingPrecision={3}
          number={backLeft.y}
          maxWidthCharacters={8}
          titleTooltip="Y coordinate of back left module (positive)"
        />
        <ExpressionInput
          title="Back Right X"
          enabled={true}
          roundingPrecision={3}
          number={backRight.x}
          maxWidthCharacters={8}
          titleTooltip="X coordinate of back right module (negative)"
        />
        <ExpressionInput
          title="Back Right Y"
          enabled={true}
          roundingPrecision={3}
          number={backRight.y}
          maxWidthCharacters={8}
          titleTooltip="Y coordinate of back right module (negative)"
        />
        <ExpressionInput
          title="Front Right X"
          enabled={true}
          roundingPrecision={3}
          number={frontRight.x}
          maxWidthCharacters={8}
          titleTooltip="X coordinate of front right module (negative)"
        />
        <ExpressionInput
          title="Front Right Y"
          enabled={true}
          roundingPrecision={3}
          number={frontRight.y}
          maxWidthCharacters={8}
          titleTooltip="Y coordinate of front right module (negative)"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(SwerveConfigPanel);
