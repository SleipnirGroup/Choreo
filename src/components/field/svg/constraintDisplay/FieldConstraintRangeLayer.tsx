import { observer } from "mobx-react";
import { doc } from "../../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";

type Props = {
  points: IHolonomicWaypointStore[];
  start: number;
  end?: number;
  id: string;
  lineColor?: string;
  showLines?: boolean;
  showCircles?: boolean;
  onCircleMouseOver?: ((idx: number) => void) | undefined;
  onCircleMouseOff?: ((idx: number) => void) | undefined;
  onCircleClick?: ((idx: number) => void) | undefined;
};

function FieldConstraintRangeLayer(props: Props) {
  const lineColor = props.lineColor ?? "var(--select-yellow)";
  const id = props.id;
  const onCircleClick = props.onCircleClick ?? ((_arg) => {});
  const onCircleMouseOver = props.onCircleMouseOver ?? ((_arg) => {});
  const onCircleMouseOff = props.onCircleMouseOff ?? ((_arg) => {});
  if (props.start !== undefined) {
    const points = props.points.slice(
      props.start,
      (props.end ?? props.start) + 1
    );
    return (
      <g>
        <g fill="none" stroke={lineColor}>
          <g
            id={`range-circles-${id}`}
            visibility={props.showCircles ? "show" : "none"}
          >
            {points.map((w, i) => {
              return (
                <circle
                  key={w.uuid}
                  cx={w.x.value}
                  cy={w.y.value}
                  r={
                    0.225 *
                    Math.min(
                      doc.robotConfig.bumper.width,
                      doc.robotConfig.bumper.length
                    )
                  }
                  strokeWidth={0.05}
                  onClick={(_e) => onCircleClick(i + props.start)}
                  onMouseOver={(_e) => onCircleMouseOver(i + props.start)}
                  onMouseLeave={(_e) => onCircleMouseOff(i + props.start)}
                  style={
                    props.onCircleClick === undefined &&
                    props.onCircleMouseOff === undefined &&
                    props.onCircleMouseOver === undefined
                      ? { pointerEvents: "none" }
                      : { pointerEvents: "visible" }
                  }
                ></circle>
              );
            })}
          </g>
        </g>
        <defs>
          <mask id={`range-clip-${id}`}>
            <circle r={100000} fill="white"></circle>
            <use
              href={`#range-circles-${id}`}
              fill="black"
              stroke="black"
            ></use>
          </mask>
        </defs>
        {(props.showLines ?? true) && (
          <g id={`range-lines-${id}`} mask={`url('#range-clip-${id}')`}>
            {points.map((w, i) => {
              const next = points[i + 1];
              return (
                <g key={w.uuid}>
                  {next !== undefined && (
                    <line
                      x1={w.x.value}
                      y1={w.y.value}
                      x2={next.x.value}
                      y2={next.y.value}
                      stroke={lineColor}
                      strokeWidth={0.1}
                      style={{ pointerEvents: "none" }}
                      strokeDasharray={0.1}
                    ></line>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  }
}
export default observer(FieldConstraintRangeLayer);
