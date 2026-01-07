import { useRef } from "react";
import useAutoSize from "../../util/autosize/useAutoSize";

export default function AutoSizingInput (props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>){
    const ref = useRef(null);
  const autoSize = useAutoSize(() => ref.current, ()=>true);
  return <input onChange={e=>{autoSize(e); props.onChange?.(e);}} ref={ref}></input>;
}