const autoSize = (element: HTMLElement) => {
  element.style.width = "0";
  const { borderLeftWidth, borderRightWidth } = getComputedStyle(element);
  /**
   * Turns a string like '36px' into the number 36
   */
  const numberPxToNumber = (numberPx: string) =>
    parseInt(numberPx.slice(0, -2));
  const borderWidth =
    numberPxToNumber(borderLeftWidth) + numberPxToNumber(borderRightWidth);
  // For some reason border is not included in scrollWidth
  element.style.width = `${element.scrollWidth + borderWidth}px`;
};

export default autoSize;
