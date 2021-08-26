import React, { useEffect, useState, CSSProperties } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Row, Button, Col, Progress, InputNumber } from 'antd';
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
  // first line is field names,
  // rest will [ ["0000", "pelegreen", "silver"], [...] ]
  // filter any empty lines
  const [keys, ...values] = data.filter(el => el.length > 1);
  // console.log('data', data);

  const mapValuesToKeys = (valueArr: string[]) =>
    valueArr.reduce(
      (acc: any, value: any, idx: number) => {
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

type Token = {
  name: string;
  metadataAccount?: StringPublicKey;
  mintKey?: StringPublicKey;
  associatedTokenAddress?: StringPublicKey;
} | void;
interface mintedProps {
  idx: number;
  token: Token;
  error?: Error;
}

const date = new Date().toDateString().replaceAll(' ', '-').toLocaleLowerCase();

export const ArtCreateBulkView = () => {
  const { connected } = useWallet();
  const [csvData, setCsvData] = useState<unknown[]>([]);
  const [csvDataPartial, setCsvDataPartial] = useState<unknown[]>([]);
  const [startMint, setStartMint] = useState(false);
  const [csvError, setScvError] = useState(false);
  const [threadNumber, setTreadNumber] = useState(15);
  const [mintedTokens, setMintedToken] = useState({});
  const [startMintFromIdx, setStartMintFromIdx] = useState(0);
  const [endMintFromIdx, setEndMintFromIdx] = useState(0);

  const addMintedTokenInfo = ({ idx: idxInSet, token }: mintedProps) => {
    setMintedToken(state => ({
      ...state,
      [idxInSet]: [token?.mintKey, token?.associatedTokenAddress],
    }));
  };

  const handleSCV = (data: string[][], fileInfo: IFileInfo) => {
    // console.log(data, fileInfo);
    try {
      const dataNormalized = normalizeData(data);
      console.log('dataNormalized', dataNormalized);
      setCsvData(dataNormalized);
      setCsvDataPartial(dataNormalized);
      setStartMintFromIdx(0);
      setEndMintFromIdx(dataNormalized.length);
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

  const mintChunkSize = Math.ceil(csvDataPartial?.length / threadNumber);
  console.log('mintChunkSize', mintChunkSize);

  const getJsonHref = () => {
    const output = JSON.stringify(mintedTokens);
    const blob = new Blob([output]);
    const fileDownloadUrl = URL.createObjectURL(blob);

    return fileDownloadUrl;
  };

  const onStartIdxChange = (value: number) => {
    const dataPartial = csvData.slice(value, endMintFromIdx);
    setCsvDataPartial(dataPartial);
    setStartMintFromIdx(value);
    console.log('You are going to mint this set:', dataPartial);
  };

  const onEndIdxChange = (value: number) => {
    const dataPartial = csvData.slice(startMintFromIdx, value);
    setCsvDataPartial(dataPartial);
    setEndMintFromIdx(value);
    console.log('You are going to mint this set:', dataPartial);
  };

  // const isAllMinted =
  // csvDataPartial.length > 0 && csvDataPartial.length === Object.keys(mintedTokens).length;

  return (
    <div className="">
      <h1>Create Items from csv</h1>

      <Row style={{ paddingTop: 50 }}>
        <Col span={12}>
          <CSVReader
            onFileLoaded={handleSCV}
            onError={error => console.log(error)}
            disabled={startMint}
          />
          <br />
          <h3>Set is <b>{csvData.length}</b> length | You are going to mint <b>{csvDataPartial.length}</b> NFTs</h3>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <a
            href={getJsonHref()}
            download={`minted-tokens-${date}.json`}
            // hidden={!isAllMinted}
          >
            <Button type="primary" style={styles.button}>
              Download Mint Data
            </Button>
          </a>
        </Col>
      </Row>

      <hr />
      <br />

      {startMint ? (
        <>
          {chunks(csvDataPartial, mintChunkSize).map((data, index) => (
            <ErrorBoundary
              key={index}
              FallbackComponent={ErrorFallback}
              onReset={() => {
                // reset the state of your app so the error doesn't happen again
              }}
            >
              <MintFromData
                data={data}
                chunkIdx={index}
                mintChunkSize={mintChunkSize}
                addMintedTokenInfo={addMintedTokenInfo}
                globalIdxOffset={startMintFromIdx}
              />
            </ErrorBoundary>
          ))}
          <>
            <br />
            <h2>Minted Items:</h2>
            <pre style={styles.pre as CSSProperties}>
              {JSON.stringify(mintedTokens, undefined, 2)}
            </pre>
          </>
        </>
      ) : (
        <>
          <label className="action-field">
            <Row>
              <Col span={8}>
                <span className="field-title">
                  Start mint from index (including):
                </span>
                <InputNumber
                  min={0}
                  step={1}
                  max={csvData.length - 1}
                  placeholder="Start mint from index:"
                  onChange={onStartIdxChange}
                  className="mint-input"
                  style={styles.mintInput}
                  value={startMintFromIdx}
                  disabled={!csvData.length}
                />
              </Col>
              <Col span={8}>
                <span className="field-title">
                  End mint on index (excluding):
                </span>
                <InputNumber
                  min={startMintFromIdx + 1}
                  max={csvData.length}
                  step={1}
                  placeholder="End mint from index:"
                  onChange={onEndIdxChange}
                  className="mint-input"
                  style={styles.mintInput}
                  value={endMintFromIdx}
                  disabled={!csvData.length}
                />
              </Col>
            </Row>
            <div>
              <br />
              <hr />
              <br />
              <span className="field-title">Number of Threads</span>
              <InputNumber
                min={1}
                max={50}
                step={1}
                placeholder="Number of Threads"
                onChange={setTreadNumber}
                className="mint-input"
                style={styles.mintInput}
                value={threadNumber}
                disabled={!csvData.length}
              />
              <br />
              <br />
              <hr />
            </div>
          </label>
          <Button
            type="primary"
            size="large"
            onClick={onStartClicked}
            disabled={!csvData.length}
            style={{ fontSize: '2em', height: 'auto' }}
          >
            Start Minting - {csvDataPartial.length} itm.
          </Button>
          <br />

          <pre style={styles.pre as CSSProperties}>
            {csvDataPartial.map((row: any) => (
              <div>{JSON.stringify(row.name, undefined, 2)} </div>
            ))}
          </pre>
        </>
      )}
    </div>
  );
};

interface MintFromDataProps {
  data: any;
  chunkIdx: number;
  mintChunkSize: number;
  addMintedTokenInfo: (props: mintedProps) => void;
  globalIdxOffset: number;
}

const MintFromData = ({
  data,
  chunkIdx,
  mintChunkSize,
  addMintedTokenInfo,
  globalIdxOffset,
}: MintFromDataProps) => {
  const [idxToMint, setIdxToMint] = useState(0);
  const [error, setError] = useState<Error>();
  const [completed, setCompleted] = useState(false);

  const onItemMinted = ({ idx, token, error }: mintedProps) => {
    const idxInSet = mintChunkSize * chunkIdx + idx + globalIdxOffset;

    addMintedTokenInfo({ idx: idxInSet, token });

    const idxUpdated = idx + 1;
    const numberOfItems = data.length;

    if (error) setError(error);
    if (idxUpdated === numberOfItems) setCompleted(true);
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
          {error ? (
            <div style={{ fontSize: '0.75em' }}>
              ⚠️ Some failed mints in this tread, check json for undefined/null
              values.
              <pre>Error: {error.message}</pre>
              <hr />
            </div>
          ) : null}
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
        mintChunkSize={mintChunkSize}
        globalIdxOffset={globalIdxOffset}
      />
      <Progress percent={progress} status="active" />
    </>
  );
};

const attributesDefault = {
  name: 'Noname Thug',
  symbol: '',
  description:
    'You hold in your possession an OG thugbird. It was created with love for the Solana community by 0x_thug',
  external_url: 'https://www.thugbirdz.com/',
  image: '',
  animation_url: undefined,
  // 500 is 5%
  seller_fee_basis_points: 500,
  creators: [],
  properties: {
    files: [],
    category: MetadataCategory.Image,
    maxSupply: 0,
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
  mintChunkSize,
  globalIdxOffset,
}: any) => {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const { wallet, connected } = useWallet();
  const [progress, setProgress] = useState<number>(0);

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
    const imageIdx = mintChunkSize * chunkIdx + idx + globalIdxOffset;

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
    try {
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

      const imageIdx = mintChunkSize * chunkIdx + idx;
      console.log(`metadata for file ${imageIdx}`, metadata);

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
      onMintItemComplete({ ..._nft, name: metadata.name });
      clearInterval(inte);
    } catch (error) {
      console.warn(`⚠️ Mint failed for item ${idx}`, error);
      onMintItemComplete(undefined, error);
    }
  };

  const onMintItemComplete = (token: Token, error?: Error) => {
    setProgress(0);
    onComplete({
      idx,
      token,
      error,
    });
  };

  return (
    <>
      <Row style={{ paddingTop: 50 }}>
        <Col span={24}>
          <WaitingStep
            progress={progress}
            idx={idx}
            chunkIdx={chunkIdx}
            mintChunkSize={mintChunkSize}
          />
        </Col>
      </Row>
    </>
  );
};

interface PropsWaitingStep {
  progress: number;
  idx: number;
  chunkIdx: number;
  mintChunkSize: number;
}

const WaitingStep = ({
  progress,
  idx,
  chunkIdx,
  mintChunkSize,
}: PropsWaitingStep) => {
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

interface ErrorProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorProps) => {
  return (
    <div role="alert" style={styles.container}>
      <p style={styles.p}>Thread failed with error:</p>
      <pre>{error.message}</pre>
      {/* <button onClick={resetErrorBoundary}>Try again</button> */}
    </div>
  );
};

const styles = {
  container: {
    background: 'tomato',
    color: 'black',
    padding: '10px',
    marginTop: '20px',
  },
  p: {
    color: 'white',
  },
  button: {
    background: 'black',
    borderColor: 'black',
  },
  mintInput: {
    fontSize: '1.5em',
  },
  pre: {
    background: 'rgba(0,0,0,.5)',
    whiteSpace: 'normal',
    margin: '2em 0',
    padding: '2em',
  },
};
