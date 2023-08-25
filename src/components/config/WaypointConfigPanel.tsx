import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import Input from "../input/Input";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import { RadioGroup, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { NavbarItemData } from "../../document/UIStateStore";
import Waypoint from "../../assets/Waypoint";
import { Circle, CircleOutlined } from "@mui/icons-material";
import inputStyles from "../input/InputList.module.css";

type Props = { waypoint: IHolonomicWaypointStore | null };

type State = {};

class WaypointPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  isWaypointNonNull(
    point: IHolonomicWaypointStore | null
  ): point is IHolonomicWaypointStore {
    return (point as IHolonomicWaypointStore) !== null;
  }
  render() {
    let { waypoint } = this.props;
    let waypointType = 1;
    if (waypoint?.headingConstrained) {
      waypointType = 0;
    } else  if (waypoint?.translationConstrained) {
      waypointType = 1;
    } else {
      waypointType = 2;
    }
    if (this.isWaypointNonNull(waypoint)) {
      return (
        <div className={styles.WaypointPanel}>

          <InputList noCheckbox>
          {/* <span className={inputStyles.Title}></span>

          <span></span>
          <span></span> */}
            <Input
              title="x"
              suffix="m"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              number={waypoint.x}
              setNumber={(x) => waypoint!.setX(x)}
            ></Input>
            <Input
              title="y"
              suffix="m"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              number={waypoint.y}
              setNumber={(y) => waypoint!.setY(y)}
            ></Input>
            <Input
              title="θ"
              suffix="rad"
              showCheckbox={false}
              enabled={waypoint.headingConstrained}
              setEnabled={(_) => {}}
              number={waypoint.heading}
              setNumber={(heading) => waypoint!.setHeading(heading)}
            ></Input>

          </InputList>
          <ToggleButtonGroup
          sx={{marginInline:"auto",paddingTop:"8px"}}
          size="small"
          exclusive
          value={waypointType}
          onChange={(e, newSelection) => {
            switch (newSelection) {
              case 0:
                waypoint?.setHeadingConstrained(true);
                waypoint?.setTranslationConstrained(true);
                break;
              case 1: 
                waypoint?.setHeadingConstrained(false);
                waypoint?.setTranslationConstrained(true);
                break;
              case 2: 
                waypoint?.setTranslationConstrained(false);
                waypoint?.setHeadingConstrained(false);
              default:
                break;
            }
          }}>
            
            <Tooltip value={0} title="Full Waypoint">
              <ToggleButton value={0} sx={{
                  color: "var(--accent-purple)",
                  "&.Mui-selected": {
                    color: "var(--select-yellow)",
                  },
                }}>
                <Waypoint/>
              </ToggleButton>
            </Tooltip>
            <Tooltip value={1} title="Translation Waypoint">
              <ToggleButton value={1} sx={{
                  color: "var(--accent-purple)",
                  "&.Mui-selected": {
                    color: "var(--select-yellow)",
                  },
                }}>
                <Circle/>
              </ToggleButton>
            </Tooltip>
            <Tooltip value={2} title="Initial Guess Waypoint">
              <ToggleButton value={2} sx={{
                  color: "var(--accent-purple)",
                  "&.Mui-selected": {
                    color: "var(--select-yellow)",
                  },
                }}>
                <CircleOutlined/>
              </ToggleButton> 
            </Tooltip>
          </ToggleButtonGroup>
        </div>
      );
    }
  }
}
export default observer(WaypointPanel);
