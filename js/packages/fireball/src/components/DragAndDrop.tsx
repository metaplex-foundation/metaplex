import React from "react"
import {
  useColorMode,
} from "../contexts/ColorModeContext";

export const DragAndDrop = (
  props : {
    handleDrop : (files : FileList) => void,
    children : React.ReactNode,
  },
) => {
  const dropRef = React.useRef<HTMLDivElement>(null);
  const [dragCounter, setDragCounter] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
  };

  const handleDragIn = (e) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter(dragCounter + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const remainingDrags = dragCounter - 1;
    setDragCounter(remainingDrags);
    if (remainingDrags === 0) {
      setDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      props.handleDrop(e.dataTransfer.files);
      e.dataTransfer.clearData();
      setDragCounter(0);
    }
  };

  React.useEffect(() => {
    const node = dropRef.current;
    if (node === null) return;
    node.addEventListener("dragenter" , handleDragIn);
    node.addEventListener("dragleave" , handleDragOut);
    node.addEventListener("dragover"  , handleDrag);
    node.addEventListener("drop"      , handleDrop);

    return () => {
      node.removeEventListener("dragenter" , handleDragIn);
      node.removeEventListener("dragleave" , handleDragOut);
      node.removeEventListener("dragover"  , handleDrag);
      node.removeEventListener("drop"      , handleDrop);
    };
  });

  const colorModeCtx = useColorMode();
  const shade = colorModeCtx.mode === 'dark' ? "rgba(255,255,255,.1)" : "rgba(0, 0, 0,.1)";

  return (
    <div
      ref={dropRef}
      style={dragging ? { backgroundColor: shade} : {}}
    >
      {props.children}
    </div>
  );
};


export default DragAndDrop;
