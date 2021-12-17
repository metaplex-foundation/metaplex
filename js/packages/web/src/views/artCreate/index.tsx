import {
  IMetadataExtension,
  MetadataCategory,
  MetaplexOverlay,
  StringPublicKey,
  useConnection,
  useConnectionConfig,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Col, Row, Space, Steps } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mintNFT } from '../../actions';
import { useAnalytics } from '../../components/Analytics';
import useWindowDimensions from '../../utils/layout';
import { CategoryStep } from './categoryStep';
import { Congrats } from './congrats';
import { InfoStep } from './infoStep';
import { LaunchStep } from './launchStep';
import { RoyaltiesStep } from './royaltiesStep';
import { UploadStep } from './uploadStep';
import { WaitingStep } from './waitingStep';

const { Step } = Steps;

export const ArtCreateView = () => {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const wallet = useWallet();
  const [alertMessage, setAlertMessage] = useState<string>();
  const { step_param } = useParams<{ step_param: string }>();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0);

  const [step, setStep] = useState<number>(0);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [isMinting, setMinting] = useState<boolean>(false);
  const [nft, setNft] = useState<
    { metadataAccount: StringPublicKey } | undefined
  >(undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File>();
  const [mainFile, setMainFile] = useState<File>();
  const [attributes, setAttributes] = useState<IMetadataExtension>({
    name: '',
    symbol: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: undefined,
    seller_fee_basis_points: 0,
    creators: [],
    properties: {
      files: [],
      category: MetadataCategory.Image,
    },
  });

  const { track } = useAnalytics();

  const gotoStep = useCallback(
    (_step: number) => {
      navigate(`/nfts/new/${_step.toString()}`);
      if (_step === 0) setStepsVisible(true);
    },
    [history],
  );

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoStep(0);
  }, [step_param, gotoStep]);

  // store files
  const mint = async () => {
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      attributes: attributes.attributes,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
      },
    };
    setStepsVisible(false);
    setMinting(true);
    setAlertMessage(undefined);

    try {
      const _nft = await mintNFT(
        connection,
        wallet,
        env,
        files,
        metadata,
        setNFTcreateProgress,
        attributes.properties?.maxSupply,
        coverFile,
        mainFile,
      );

      if (_nft) setNft(_nft);

      try {
        // const mintPriceSol = (await getSolCostForMint(files, connection, attributes))
        track('nft_created', {
          category: 'creation',
          label: metadata.properties.category,
          // sol_value: mintPriceSol.
        });
      } catch (error) {
        console.error(error);
      }
    } catch (e: any) {
      if (typeof e === 'object' && e !== null && 'message' in e) {
        setAlertMessage(e.message);
      }
    } finally {
      setMinting(false);
    }
  };

  return (
    <>
      <Row>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
            >
              <Step title="Category" />
              <Step title="Upload" />
              <Step title="Info" />
              <Step title="Royalties" />
              <Step title="Launch" />
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          <Space
            className="metaplex-fullwidth metaplex-space-align-stretch"
            direction="vertical"
          >
            {step === 0 && (
              <CategoryStep
                confirm={(category: MetadataCategory) => {
                  setAttributes({
                    ...attributes,
                    properties: {
                      ...attributes.properties,
                      category,
                    },
                  });
                  gotoStep(1);
                }}
              />
            )}
            {step === 1 && (
              <UploadStep
                onSetCoverFile={setCoverFile}
                onSetMainFile={setMainFile}
                attributes={attributes}
                setAttributes={setAttributes}
                files={files}
                setFiles={setFiles}
                confirm={() => gotoStep(2)}
              />
            )}

            {step === 2 && (
              <InfoStep
                attributes={attributes}
                files={files}
                setAttributes={setAttributes}
                confirm={() => gotoStep(3)}
              />
            )}
            {step === 3 && (
              <RoyaltiesStep
                attributes={attributes}
                confirm={() => gotoStep(4)}
                setAttributes={setAttributes}
              />
            )}
            {step === 4 && (
              <LaunchStep
                attributes={attributes}
                files={files}
                confirm={() => gotoStep(5)}
                connection={connection}
              />
            )}
            {step === 5 && (
              <WaitingStep
                mint={mint}
                minting={isMinting}
                step={nftCreateProgress}
                confirm={() => gotoStep(6)}
              />
            )}
            {0 < step && step < 5 && (
              <Row justify="center">
                <Button onClick={() => gotoStep(step - 1)}>Back</Button>
              </Row>
            )}
          </Space>
        </Col>
      </Row>
      <MetaplexOverlay visible={step === 6}>
        <Congrats nft={nft} alert={alertMessage} />
      </MetaplexOverlay>
    </>
  );
};

export const useArtworkFiles = (
  files: File[],
  attributes: IMetadataExtension,
) => {
  const [data, setData] = useState<{ image: string; animation_url: string }>({
    image: '',
    animation_url: '',
  });

  useEffect(() => {
    if (attributes.image) {
      const file = files.find(f => f.name === attributes.image);
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              image: (event.target?.result as string) || '',
            };
          });
        };
        if (file) reader.readAsDataURL(file);
      }
    }

    if (attributes.animation_url) {
      const file = files.find(f => f.name === attributes.animation_url);
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              animation_url: (event.target?.result as string) || '',
            };
          });
        };
        if (file) reader.readAsDataURL(file);
      }
    }
  }, [files, attributes]);

  return data;
};
