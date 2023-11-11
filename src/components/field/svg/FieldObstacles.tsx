import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { observer } from "mobx-react";
import { Circle } from "@mui/icons-material";
import { Box } from "@mui/material";

type Props = {};

type State = {};
const STROKE = 0.05;

class FieldGrid extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  
  render() {
    return (
      <>
      {true &&
        this.context.model.document.pathlist.activePath.obstacles.map((o) => {
          console.log(o.x, o.y, o.radius);
          return (<circle
            cx={o.x}
            cy={o.y}
            r={o.radius}
            fill={"red"}
            fillOpacity={0.5}
          ></circle>);
        })}
      </>
    );
  }
}
export default observer(FieldGrid);
