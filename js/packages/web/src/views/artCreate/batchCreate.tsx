
import React, { useEffect, useState, useCallback } from 'react';
import {
  Steps,
  Row,
  Button,
  Upload,
  Col,
  Input,
  Statistic,
  Slider,
  Progress,
  Spin,
  InputNumber,
  Form,
  Typography,
  Space,
} from 'antd';
import { ArtCard } from './../../components/ArtCard';
import { UserSearch, UserValue } from './../../components/UserSearch';
import { Confetti } from './../../components/Confetti';
import { mintNFT } from '../../actions';
import {
  MAX_METADATA_LEN,
  useConnection,
  IMetadataExtension,
  Attribute,
  MetadataCategory,
  useConnectionConfig,
  Creator,
  shortenAddress,
  MetaplexModal,
  MetaplexOverlay,
  MetadataFile,
  StringPublicKey,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssetCostToStore, LAMPORT_MULTIPLIER } from '../../utils/assets';
import { Connection } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import { cleanName, getLast } from '../../utils/utils';
import { AmountLabel } from '../../components/AmountLabel';
import useWindowDimensions from '../../utils/layout';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Step } = Steps;
const { Dragger } = Upload;
const { Text } = Typography;


// what this does is is it inits the variables, wallet etc and pushes us to the upload page
export const BatchCreate = () => {
  
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const wallet = useWallet();
  const { publicKey, connected } = useWallet();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<number>(0);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [nft, setNft] =
    useState<{ metadataAccount: StringPublicKey } | undefined>(undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [attributes, setAttributes] = useState<IMetadataExtension>({
    name: '',
    symbol: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: undefined,
    seller_fee_basis_points: 100,
    creators: [new Creator({
      address: process.env.W1 as string, verified: process.env.W1 as string === publicKey?.toBase58(), share: 50,
    }), new Creator({
      address: process.env.W2 as string, verified: process.env.W2 as string === publicKey?.toBase58(), share: 50,
    })],
    properties: {
      files: [],
      category: MetadataCategory.Image,
    },
  });

  
  console.log(attributes)
  const gotoStep = useCallback(
    (_step: number) => {
      history.push(`/art/batch/${_step.toString()}`);
      if (_step === 0) setStepsVisible(true);
    },
    [history],
  );

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
    const inte = setInterval(
      () => setProgress(prog => Math.min(prog + 1, 99)),
      600,
    );
    // Update progress inside mintNFT
    const _nft = await mintNFT(
      connection,
      wallet,
      env,
      files,
      metadata,
      attributes.properties?.maxSupply,
    );
    if (_nft) setNft(_nft);
    clearInterval(inte);
  };

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoStep(0);
  }, [step_param, gotoStep]);

  return (
    <>
      <Row style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <Step title="Upload" />
              <Step title="Launch" />
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          {step === 0 && (
            <UploadStep
              attributes={attributes}
              setAttributes={setAttributes}
              files={files}
              setFiles={setFiles}
              confirm={() => gotoStep(1)}
            />
          )}
          {step === 1 && (
            <LaunchStep
              attributes={attributes}
              files={files}
              confirm={() => gotoStep(2)}
              connection={connection}
            />
          )}
          {step === 2 && (
            <WaitingStep
              mint={mint}
              progress={progress}
              confirm={() => gotoStep(4)}
            />
          )}
          {0 < step && step < 2 && (
            <div style={{ margin: 'auto', width: 'fit-content' }}>
              <Button onClick={() => gotoStep(step - 1)}>Back</Button>
            </div>
          )}
        </Col>
      </Row>
      <MetaplexOverlay visible={step === 4}>
        <Congrats nft={nft} />
      </MetaplexOverlay>
    </>
  );
};

// this is the upload step, drag an image in. TODO: Replace with reading a file or GDrive?
const UploadStep = (props: {
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  confirm: () => void;
}) => {
  const [coverFile, setCoverFile] = useState<File | undefined>(
    props.files?.[0],
  );
  const [mainFile, setMainFile] = useState<File | undefined>(props.files?.[1]);

  const [customURL, setCustomURL] = useState<string>('');
  const [customURLErr, setCustomURLErr] = useState<string>('');
  const disableContinue = !coverFile || !!customURLErr;

    
  let name = "A deepness"
  let description = ""
  let seller_fee_basis_points = 1 * 100 // i.e 1% of all future sales

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      properties: {
        ...props.attributes.properties,
        files: [],
      },
    });

  }, []);


  return (
    <>
      <Row className="call-to-action">
        <h2>Now, let's upload your creation</h2>
      </Row>
      <Row className="content-action">
        <h3>Upload a cover image (PNG, JPG, GIF)</h3>
        <Dragger
          accept=".png,.jpg,.gif,.mp4"
          style={{ padding: 20 }}
          multiple={false}
          customRequest={info => {
            // dont upload files here, handled outside of the control
            info?.onSuccess?.({}, null as any);
          }}
          fileList={coverFile ? [coverFile as any] : []}
          onChange={async info => {
            const file = info.file.originFileObj;
            if (file) setCoverFile(file);
          }}
        >
          <div className="ant-upload-drag-icon">
            <h3 style={{ fontWeight: 700 }}>
              Upload your cover image (PNG, JPG, GIF)
            </h3>
          </div>
          <p className="ant-upload-text">Drag and drop, or click to browse</p>
        </Dragger>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          disabled={disableContinue}
          onClick={() => {
            props.setAttributes({
              ...props.attributes,
              properties: {
                ...props.attributes.properties,
                files: [coverFile, mainFile, customURL]
                  .filter(f => f)
                  .map(f => {
                    const uri = typeof f === 'string' ? f : f?.name || '';
                    const type =
                      typeof f === 'string' || !f
                        ? 'unknown'
                        : f.type || getLast(f.name.split('.')) || 'unknown';

                    return {
                      uri,
                      type,
                    } as MetadataFile;
                  }),
              },
              image: coverFile?.name || '',
              animation_url: mainFile && mainFile.name,
              name: coverFile?.name.replace(/_/g, ' ').replace(".png", "").replace("(high quality), featured on Artstation", "") || 'Unknown name',
              description: description,
              seller_fee_basis_points: seller_fee_basis_points,
            });
            props.setFiles([coverFile, mainFile].filter(f => f) as File[]);
            props.confirm();
          }}
          style={{ marginTop: 24 }}
          className="action-btn"
        >
          Continue to Mint
        </Button>
      </Row>
    </>
  );
}; 

const useArtworkFiles = (files: File[], attributes: IMetadataExtension) => {
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

// this tells us how much we need to pay, and auths it
const LaunchStep = (props: {
  confirm: () => void;
  attributes: IMetadataExtension;
  files: File[];
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  const { image, animation_url } = useArtworkFiles(
    props.files,
    props.attributes,
  );
  const files = props.files;
  const metadata = props.attributes;

  console.log(props)
  useEffect(() => {
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ]);
    if (files.length)
      getAssetCostToStore([
        ...files,
        new File([JSON.stringify(metadata)], 'metadata.json'),
      ]).then(async lamports => {
        const sol = lamports / LAMPORT_MULTIPLIER;

        // TODO: cache this and batch in one call
        const [mintRent, metadataRent] = await rentCall;

        const additionalSol = (metadataRent + mintRent) / LAMPORT_MULTIPLIER;

        // TODO: add fees based on number of transactions and signers
        setCost(sol + additionalSol);
      });
  }, [files, metadata, setCost]);

  return (
    <>
      <Row className="call-to-action">
        <h2>Launch your creation</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </Row>
      <Row className="content-action" justify="space-around">
        <Col>
          {props.attributes.image && (
            <ArtCard
              image={image}
              animationURL={animation_url}
              category={props.attributes.properties?.category}
              name={props.attributes.name}
              symbol={props.attributes.symbol}
              small={true}
            />
          )}
        </Col>
        <Col className="section" style={{ minWidth: 300 }}>
          <Statistic
            className="create-statistic"
            title="Royalty Percentage"
            value={props.attributes.seller_fee_basis_points / 100}
            precision={2}
            suffix="%"
          />
          {cost ? (
            <AmountLabel title="Cost to Create" amount={cost.toFixed(5)} />
          ) : (
            <Spin />
          )}
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Pay with SOL
        </Button>
      </Row>
    </>
  );
};

const WaitingStep = (props: {
  mint: Function;
  progress: number;
  confirm: Function;
}) => {
  useEffect(() => {
    const func = async () => {
      await props.mint();
      props.confirm();
    };
    func();
  }, []);

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Progress type="circle" percent={props.progress} />
      <div className="waiting-title">
        Your creation is being uploaded to the decentralized web...
      </div>
      <div className="waiting-subtitle">This can take up to 1 minute.</div>
    </div>
  );
};

const Congrats = (props: {
  nft?: {
    metadataAccount: StringPublicKey;
  };
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT artwork on Metaplex, check it out!",
      url: `${
        window.location.origin
      }/#/art/${props.nft?.metadataAccount.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  return (
    <>
      <div className="waiting-title">Congratulations, you created an NFT!</div>
      <div className="congrats-button-container">
        <Button
          className="metaplex-button"
          onClick={_ => window.open(newTweetURL(), '_blank')}
        >
          <span>Share it on Twitter</span>
          <span>&gt;</span>
        </Button>
        <Button
          className="metaplex-button"
          onClick={_ =>
            history.push(`/art/${props.nft?.metadataAccount.toString()}`)
          }
        >
          <span>See it in your collection</span>
          <span>&gt;</span>
        </Button>
        <Button
          className="metaplex-button"
          onClick={_ => history.push('/auction/create')}
        >
          <span>Sell it via auction</span>
          <span>&gt;</span>
        </Button>
      </div>
      <Confetti />
    </>
  );
};


