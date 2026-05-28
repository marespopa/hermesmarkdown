declare module 'textarea-caret' {
  interface CaretCoordinates {
    top: number;
    left: number;
    height: number;
  }
  function getCaretCoordinates(element: HTMLTextAreaElement, position: number): CaretCoordinates;
  export default getCaretCoordinates;
}
