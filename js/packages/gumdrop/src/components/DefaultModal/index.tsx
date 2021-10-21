import React from "react";
import { Modal } from "antd";

import "./index.css";

export const DefaultModal = (props: any) => {
  const { children, closeIcon, bodyStyle, style, ...rest } = props;

  return (
    <Modal
      style={{ background: "transparent", borderRadius: 16 }}
      bodyStyle={{
        background: "#333333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...bodyStyle,
      }}
      footer={null}
      width={400}
      {...rest}
    >
      {children}
    </Modal>
  );
};
