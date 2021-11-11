import {
  IMetadataExtension,
  MetadataCategory,
  MetadataFile,
} from '@oyster/common';
import { Button, Space, Typography, Upload } from 'antd';
import React, { useEffect, useState } from 'react';
import { getLast } from '../../utils/utils';

const { Dragger } = Upload;
const { Text } = Typography;

export const UploadStep = (props: {
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  confirm: () => void;
  onSetCoverFile?: (f: File) => void;
  onSetMainFile?: (f: File) => void;
}) => {
  const [coverFile, setCoverFile] = useState<File | undefined>(
    props.files?.[0],
  );
  const [mainFile, setMainFile] = useState<File | undefined>(props.files?.[1]);
  const [coverArtError, setCoverArtError] = useState<string>();
  const [mainArtError, setMainArtError] = useState<string>();

  const disableContinue = !coverFile || coverArtError || mainArtError;

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      properties: {
        ...props.attributes.properties,
        files: [],
      },
    });
  }, []);

  const uploadMsg = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return 'Upload your audio creation (MP3, FLAC, WAV)';
      case MetadataCategory.Image:
        return 'Upload your image creation (PNG, JPG, GIF)';
      case MetadataCategory.Video:
        return 'Upload your video creation (MP4, MOV, GLB)';
      case MetadataCategory.VR:
        return 'Upload your AR/VR creation (GLB)';
      case MetadataCategory.HTML:
        return 'Upload your HTML File (HTML)';
      default:
        return 'Please go back and choose a category';
    }
  };

  const acceptableFiles = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return '.mp3,.flac,.wav';
      case MetadataCategory.Image:
        return '.png,.jpg,.gif';
      case MetadataCategory.Video:
        return '.mp4,.mov,.webm';
      case MetadataCategory.VR:
        return '.glb';
      case MetadataCategory.HTML:
        return '.html';
      default:
        return '';
    }
  };

  return (
    <Space direction="vertical" className="metaplex-fullwidth">
      <h2>Now, let&apos;s upload your creation</h2>
      <p>
        Your file will be uploaded to the decentralized web via IPFS. Depending
        on file type, can take up to 1 minute.
      </p>
      <h3>Upload a cover image (PNG, JPG, GIF, SVG)</h3>
      <Dragger
        accept=".png,.jpg,.gif,.mp4,.svg"
        multiple={false}
        customRequest={info => {
          // dont upload files here, handled outside of the control
          info?.onSuccess?.({}, null as any);
        }}
        fileList={coverFile ? [coverFile as any] : []}
        onChange={async info => {
          const file = info.file.originFileObj;
          setCoverFile(undefined);

          if (!file) {
            return;
          }

          props.onSetCoverFile && props.onSetCoverFile(file);
          setCoverFile(file);
          setCoverArtError(undefined);
        }}
      >
        <div>
          <h3>Upload your cover image (PNG, JPG, GIF, SVG)</h3>
        </div>
        {coverArtError ? (
          <>
            <Text type="danger">*</Text>
            <Text italic>{coverArtError}</Text>
          </>
        ) : (
          <p>Drag and drop, or click to browse</p>
        )}
      </Dragger>
      {props.attributes.properties?.category !== MetadataCategory.Image && (
        <>
          <h3>{uploadMsg(props.attributes.properties?.category)}</h3>
          <Dragger
            accept={acceptableFiles(props.attributes.properties?.category)}
            multiple={false}
            customRequest={info => {
              // dont upload files here, handled outside of the control
              info?.onSuccess?.({}, null as any);
            }}
            fileList={mainFile ? [mainFile as any] : []}
            onChange={async info => {
              const file = info.file.originFileObj;

              setMainFile(undefined);

              if (!file) {
                return;
              }

              setMainFile(file);
              props.onSetMainFile && props.onSetMainFile(file);
              setMainArtError(undefined);
            }} // TODO: enable when using payer account to avoid 2nd popup
            onRemove={() => {
              setMainFile(undefined);
            }}
          >
            <div>
              <h3>Upload your creation</h3>
            </div>
            {mainArtError ? (
              <>
                <Text type="danger">*</Text>
                <Text italic>{mainArtError}</Text>
              </>
            ) : (
              <p>Drag and drop, or click to browse</p>
            )}
          </Dragger>
        </>
      )}
      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        disabled={!!disableContinue}
        onClick={() => {
          props.setAttributes({
            ...props.attributes,
            properties: {
              ...props.attributes.properties,
              files: [coverFile, mainFile]
                .filter(f => f)
                .map(f => {
                  const uri = f?.name || '';
                  const type = f
                    ? f.type || getLast(f.name.split('.')) || 'unknown'
                    : '';

                  const ret: MetadataFile = {
                    uri,
                    type,
                  };

                  return ret;
                }),
            },
            image: coverFile?.name || '',
            animation_url: mainFile && mainFile.name,
          });
          const files = [coverFile, mainFile].filter(f => f) as File[];

          props.setFiles(files);
          props.confirm();
        }}
      >
        Continue to Mint
      </Button>
    </Space>
  );
};
