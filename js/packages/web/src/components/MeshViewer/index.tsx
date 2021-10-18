import React, { useRef } from 'react';
import '@google/model-viewer/dist/model-viewer';

type MeshViewerProps = {
  className?: string;
  url?: string;
  onError?: () => void;
};

export function MeshViewer(props: MeshViewerProps) {
  return (
    // @ts-ignore
    <model-viewer
      src={props.url}
      auto-rotate
      rotation-per-second="40deg"
      className={props.className}
      camera-controls
    />
  );
}
