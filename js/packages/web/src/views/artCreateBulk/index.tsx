import React, { useEffect, useState, useCallback } from 'react';
import { Row, Button, Col, Progress } from 'antd';
import CSVReader, { IFileInfo } from 'react-csv-reader';
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
  chunks,
} from '@oyster/common';
import { getLast } from '../../utils/utils';

const normalizeData = (data: string[][]) => {
  // keys: ["name", "Background color", "chain"]
  // values: [ ["0000", "pelegreen", "silver"], [...], [...] ]
  // filter any empty lines
  // console.log('data', data);

  const [keys, ...values] = data.filter(el => el.length > 1);

  const mapValuesToKeys = (valueArr: string[]) =>
    valueArr.reduce(
      (acc, value, idx) => {
        const key = keys[idx];
        const nameKey = 'name';

        if (key.toLowerCase() === nameKey) {
          return {
            ...acc,
            [nameKey]: value,
          };
        } else {
          return {
            ...acc,
            traits: [
              ...acc.traits,
              {
                trait_type: key,
                value,
              },
            ],
          };
        }
      },
      {
        traits: [],
      },
    );

  // [ { "name": "00000", "BG": "pelegreen" }, {...}, {...} ]
  const keyValue = values.map(mapValuesToKeys);

  return keyValue;
};

const mintChunkSize = 4;

export const ArtCreateBulkView = () => {
  const { connected } = useWallet();
  const [csvData, setCsvData] = useState<unknown[]>([]);
  const [startMint, setStartMint] = useState(false);
  const [csvError, setScvError] = useState(false);
  const handleSCV = (data: string[][], fileInfo: IFileInfo) => {
    // console.log(data, fileInfo);
    try {
      const dataNormalized = normalizeData(data);
      console.log('dataNormalized', dataNormalized);
      setCsvData(dataNormalized);
    } catch (error) {
      console.warn('CSV File parsing error:', error);
      setScvError(true);
    }
  };
  const onStartClicked = () => setStartMint(true);

  if (!connected) {
    return <h1>Please Connect your wallet to proceed!</h1>;
  }

  if (csvError) {
    return <h1>⚠️ Error parsing CSV File. Make sure all fields are correct</h1>;
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
        chunks(csvData, mintChunkSize).map((data, index) => (
          <MintFromData data={data} chunkIdx={index} />
        ))
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

const MintFromData = ({ data, chunkIdx }: any) => {
  const [idxToMint, setIdxToMint] = useState(0);
  const [error, setError] = useState();
  const [completed, setCompleted] = useState(false);

  const onItemMinted = (idx, error) => {
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
    const itemsStartAt = mintChunkSize * chunkIdx + 1;
    const itemsEndAt = mintChunkSize * (chunkIdx + 1);

    return (
      <>
        <h1>
          🎉 {itemsStartAt}-{itemsEndAt} items created successfully!
        </h1>
        <Confetti />
      </>
    );
  }

  // console.log('idxToMint', idxToMint);
  const progress = idxToMint / (data.length / 100);

  return (
    <>
      {error !== undefined ? <div>{error.message}</div> : null}
      <ArtCreateSingleItem
        data={data[idxToMint]}
        idx={idxToMint}
        onComplete={onItemMinted}
        chunkIdx={chunkIdx}
      />
      <Progress percent={progress} status="active" />
    </>
  );
};

const attributesDefault = {
  name: 'Noname Thug',
  symbol: '',
  description: 'can\'t be uncovered',
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
  collection: {
    name: 'OG Collection',
    family: 'thugbirdz',
  },
};

export const ArtCreateSingleItem = ({
  data,
  onComplete,
  idx,
  chunkIdx,
}: any) => {
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
          attributes: data.traits,
          properties,
        };

        // console.log('attributesUpdated', attributesUpdated);

        await mint(attributesUpdated, file);
      }
    }

    fetchDetails();
  }, [connected, wallet, idx]);

  const createFile = async () => {
    const imageIdx = mintChunkSize * chunkIdx + idx;

    const imageUrl = `/preminted/${imageIdx}.png`;
    let response = await fetch(imageUrl);
    let data = await response.blob();
    let metadata = {
      type: 'image/png',
    };
    let file = new File([data], `${imageIdx}.png`, metadata);

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

  // console.log('data', data);
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
      attributes: attributes.attributes,
      collection: attributes.collection,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
        maxSupply: attributesDefault.properties.maxSupply,
      },
    };

    // console.log('metadata', metadata);


    const inte = setInterval(
      () => setProgress(prog => Math.min(prog + 1, 99)),
      600,
    );

    const files = [file];
    // console.log('files', files);

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
          <WaitingStep progress={progress} idx={idx} chunkIdx={chunkIdx} />
        </Col>
      </Row>
    </>
  );
};

interface PropsWaitingStep {
  progress: number;
  idx: number;
  chunkIdx: number;
}

const WaitingStep = ({ progress, idx, chunkIdx }: PropsWaitingStep) => {
  const itemsStartAt = mintChunkSize * chunkIdx + 1;
  const itemsEndAt = mintChunkSize * (chunkIdx + 1);

  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Progress type="circle" percent={progress} width={50} />
      <div className="waiting-title">
        Thread #{chunkIdx + 1}. Creation {idx + 1}/{mintChunkSize} (
        {itemsStartAt}-{itemsEndAt}) is being uploaded to the decentralized
        web...
      </div>
    </div>
  );
};
