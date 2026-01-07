import { ChangeEventHandler, useLayoutEffect } from "react";
import autoSize from "./autoSize";

const useAutoSize = (
  getElement: () => HTMLElement | null | undefined,
  doAutoSize: () => boolean
): ChangeEventHandler<HTMLElement> => {
  const autoSizeHelper = () => {
    const element = getElement();
    if (element !== null && element !== undefined && doAutoSize()) autoSize(element);
  };

  useLayoutEffect(autoSizeHelper);

  return autoSizeHelper;
};

export default useAutoSize;
