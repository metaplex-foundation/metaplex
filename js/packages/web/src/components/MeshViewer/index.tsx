import '@google/model-viewer/dist/model-viewer';
import React from 'react';

type MeshViewerProps = {
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
      camera-controls
      class="metaplex-3d-viewer"
    />
  );
}
