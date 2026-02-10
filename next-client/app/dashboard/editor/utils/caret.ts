type CaretCoordinates = {
  top: number;
  left: number;
};

// Utility for measuring the caret position in a textarea using a mirror div.
export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): CaretCoordinates {
  const computed = window.getComputedStyle(element);
  const div = document.createElement("div");

  const mirroredStyles = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "textTransform",
    "lineHeight",
    "textIndent",
    "wordSpacing",
  ];

  mirroredStyles.forEach((prop) => {
    div.style.setProperty(prop, computed.getPropertyValue(prop));
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.left = "-9999px";
  div.style.top = "0";

  div.textContent = element.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);

  const coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft,
  };

  document.body.removeChild(div);

  return coordinates;
}
