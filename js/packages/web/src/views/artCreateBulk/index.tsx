import React, { useEffect, useState, useCallback } from 'react';
import { Row, Button, Col, Progress } from 'antd';
import CSVReader from 'react-csv-reader';
import { Confetti } from './../../components/Confetti';
import { mintNFT } from '../../actions';
import {
  useConnection,
  useWallet,
  MetadataCategory,
  useConnectionConfig,
  Creator,
  shortenAddress,
  MetadataFile,
  StringPublicKey,
} from '@oyster/common';
import { getLast } from '../../utils/utils';

export const ArtCreateBulkView = () => {
  const { connected } = useWallet();
  const [csvData, setCsvData] = useState<unknown[]>([]);
  const [startMint, setStartMint] = useState(false);
  const handleSCV = (data: unknown[], fileInfo: any) => {
    // console.log(data, fileInfo);
    const dataNormalized = data.map(row => ({
      name: row[0],
      props: [...row.slice(1)],
    }));

    setCsvData(dataNormalized);
  };
  const onStartClicked = () => setStartMint(true);

  if (!connected) {
    return <h1>Please Connect your wallet to proceed!</h1>;
  }

  return (
    <div className="">
      <h1>Create Items from csv</h1>
      <CSVReader
        onFileLoaded={handleSCV}
        onError={error => console.log(error)}
        disabled={startMint}
      />
      <br />

      {startMint ? (
        <MintFromData data={csvData} />
      ) : (
        <Button
          type="primary"
          size="large"
          onClick={onStartClicked}
          disabled={!csvData.length}
        >
          Start Minting
        </Button>
      )}
    </div>
  );
};

const MintFromData = ({ data }) => {
  const [idxToMint, setIdxToMint] = useState(0);
  const [error, setError] = useState();
  const [completed, setCompleted] = useState(false);

  const onItemMinted = (idx, error) => {
    console.log('idx', idx);
    const idxUpdated = idx + 1;
    const numberOfItems = data.length;

    if (idxUpdated === numberOfItems) setCompleted(true);
    else if (error) setError(error);
    else {
      setIdxToMint(idxUpdated);
    }
  };

  if (!data.length) {
    return null;
  }

  if (completed) {
    return (
      <>
        <h1>
          {idxToMint + 1} items created successfully! <br /> 🎉🎉🎉
        </h1>
        <Confetti />
      </>
    );
  }

  console.log('idxToMint', idxToMint);
  const progress = idxToMint / (data.length / 100);

  return (
    <>
      {error !== undefined ? <div>{error.message}</div> : null}
      <Progress percent={progress} status="active" />
      <ArtCreateSingleItem
        data={data[idxToMint]}
        idx={idxToMint}
        onComplete={onItemMinted}
      />
    </>
  );
};

const attributesDefault = {
  name: 'Untitled',
  symbol: '',
  description: 'test description',
  external_url: 'https://www.thugbirdz.com/',
  image: '',
  animation_url: undefined,
  // 500 is 5%
  seller_fee_basis_points: 500,
  creators: [],
  properties: {
    files: [],
    category: MetadataCategory.Image,
    maxSupply: 1,
  },
};

export const ArtCreateSingleItem = ({ data, onComplete, idx }: any) => {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const { wallet, connected } = useWallet();
  const [progress, setProgress] = useState<number>(0);
  const [nft, setNft] = useState<
    { metadataAccount: StringPublicKey } | undefined
  >(undefined);

  useEffect(() => {
    async function fetchDetails() {
      if (wallet?.publicKey) {
        const key = wallet.publicKey.toBase58();
        const fixedCreators = {
          key,
          label: shortenAddress(key),
          value: key,
        };

        const creator = new Creator({
          address: fixedCreators.key,
          share: 100,
          verified: true,
        });

        const file = await createFile();

        const properties = {
          ...attributesDefault.properties,
          files: [file]
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
        };
        const image = file?.name || '';

        const attributesUpdated = {
          ...attributesDefault,
          name: data.name,
          creators: [creator],
          image,
          properties,
        };

        await mint(attributesUpdated, file);
      }
    }

    fetchDetails();
  }, [connected, wallet, idx]);

  const createFile = async () => {
    const imageUrl = `/preminted/${idx + 1}.png`;
    let response = await fetch(imageUrl);
    let data = await response.blob();
    let metadata = {
      type: 'image/png',
    };
    let file = new File([data], `${idx + 1}.png`, metadata);

    return file;

    // if (file) {
    //   setAttributes(state => ({
    //     ...state,

    //   }));
    //   setFiles([file].filter(f => f) as File[]);
    // } else {
    //   console.log('No File selected for: ', imageUrl);
    // }
  };

  console.log('data', data);
  // console.log('attributes', attributesDefault);

  // store files
  const mint = async (attributes: any, file: File) => {
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
        maxSupply: attributesDefault.properties.maxSupply,
      },
    };
    const inte = setInterval(
      () => setProgress(prog => Math.min(prog + 1, 99)),
      600,
    );

    const files = [file];
    console.log('files', files);

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
    onMintItemComplete();
  };

  const onMintItemComplete = () => {
    setProgress(0);
    setNft(undefined);
    onComplete(idx);
  };

  return (
    <>
      <Row style={{ paddingTop: 50 }}>
        <Col span={24}>
          <WaitingStep progress={progress} idx={idx} />
        </Col>
      </Row>
    </>
  );
};

const WaitingStep = (props: { progress: number; idx: number }) => {
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
        Creation #{props.idx + 1} is being uploaded to the decentralized web...
      </div>
      <div className="waiting-subtitle">This can take up to 1 minute.</div>
    </div>
  );
};
