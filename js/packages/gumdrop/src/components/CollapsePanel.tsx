import * as React from "react";

import { Collapse } from 'antd';

export const CollapsePanel = (
  props: {
    panelName: string,
    children: React.ReactNode,
    id: string,
  },
) => {
  const { Panel } = Collapse;
  return (
    <div id={props.id}>
    <Collapse
      ghost
      expandIcon={panelProps =>
        panelProps.isActive ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 7.5L10 12.5L5 7.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      }
    >
      <Panel
        header={
          <span
            style={{
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '-0.01em',
              color: 'rgba(255, 255, 255, 255)',
            }}
          >
            {props.panelName}
          </span>
        }
        key="1"
      >
        {props.children}
      </Panel>
    </Collapse>
    </div>
  );
}

