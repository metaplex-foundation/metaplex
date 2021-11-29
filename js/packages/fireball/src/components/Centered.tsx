import React from "react";

export type CenteredProps = {
  children : React.ReactNode,
  height : string,
  width : string,
}

export const Centered = (
  props : CenteredProps
) => {
  return (
    <div
      style={{
        display: "table",
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "table-cell",
          verticalAlign: "middle",
        }}
      >
        <div
          style={{
            marginLeft: "auto",
            marginRight: "auto",
            height: props.height,
            width: props.width,
          }}
        >
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default Centered;
