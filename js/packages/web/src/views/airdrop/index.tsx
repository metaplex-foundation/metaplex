import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Row, Select, Typography, Upload } from 'antd';
import { ArtSelector } from "../auctionCreate/artSelector";
import { SafetyDepositDraft } from "../../actions/createAuctionManager";
import { Creator, MetaplexOverlay, StringPublicKey, useConnection, useUserAccounts } from "@oyster/common";
import * as Papa from 'papaparse';
import { PublicKey } from "@solana/web3.js";
import { mintEditionsToWallet } from "../../actions/mintEditionsIntoWallet";
import { useWallet } from "@solana/wallet-adapter-react";
import { useArt } from "../../hooks";
import { useHistory } from "react-router-dom";
import { Confetti } from "../../components/Confetti";

const { Dragger } = Upload;
const { Text } = Typography;

const validateAddresses = (addresses: Array<string>) => {
  const validAddresses: Array<string> = []
  const InvalidAddresses: Array<string> = []
  addresses.map(e => {
    try {
      new PublicKey(e)
      validAddresses.push(e)
    } catch {
      InvalidAddresses.push(e)
    }
  })
  return {
    validAddresses: validAddresses,
    invalidAddresses: InvalidAddresses
  }
}

const Congrats = () => {
  return (
    <>
      <div
        style={{
          marginTop: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div className="waiting-title">
          Congratulations! Airdrop finished
        </div>
        <div className="congrats-button-container">

        </div>
      </div>
      <Confetti />
    </>
  );
};

export const AirdropProcess = () => {
  const wallet = useWallet();
  const { accountByMint } = useUserAccounts();
  const connection = useConnection();
  const [selectedNft, setSelectedNft] = useState<SafetyDepositDraft[]>([])
  const [csvFile, setCsvFile] = useState<File | undefined>()
  const [csvError, setCsvError] = useState<String | undefined>()
  const [csvFields, setCsvFields] = useState<Array<String> | undefined>()
  const [csvData, setCsvData] = useState<Array<object> | undefined>()
  const [selectedField, setSelectedField] = useState<string | any>()
  const [validAddresses, setValidAddresses] = useState<Array<string>>([])
  const [inValidAddresses, setInValidAddresses] = useState<Array<string>>([])
  const [notMintedAddresses, setNotMintedAddresses] = useState<Array<string>>([])
  const [showCongrats, setShowCongrats] = useState<Boolean>(false)
  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    [],
  );
  useEffect(() => {
    if (csvData && selectedField) {
      const validatedData = validateAddresses(csvData.map(e => e[selectedField]))
      setValidAddresses(validatedData.validAddresses)
      setInValidAddresses(validatedData.invalidAddresses)
    }
  }, [selectedField])
  const [mintNft] = useMemo(() => selectedNft, [selectedNft])
  const art = useArt(mintNft?.metadata?.pubkey);
  const sendNfts = async (retry = false) => {
    const addresses = retry ? notMintedAddresses : validAddresses
    setNotMintedAddresses([])
    const localNotMintedAddresses : Array<string>= []
    if(art){
      const artMintTokenAccount = accountByMint.get(art.mint!);
      let startingEdition = art.supply || 0;
      for(let i = 0; i < addresses.length ; i++){
        const address = addresses[i]
        startingEdition += 1;
        console.log(`minting to ${address}`)
        try {
          await mintEditionsToWallet(
            art,
            wallet!,
            connection,
            artMintTokenAccount!,
            1,
            address,
            startingEdition,
          );
        } catch (e: any) {
          localNotMintedAddresses.push(address)
        }
        console.log(`success mint to ${address}`)
      }
    }
    setShowCongrats(true)
    setNotMintedAddresses(localNotMintedAddresses)
  }
  return (
    <>
      <MetaplexOverlay visible={showCongrats}>
        <Congrats/>
        <Button onClick={() => setShowCongrats(false)}>
          GOT IT
        </Button>
      </MetaplexOverlay>
      <Row className="creator-base-page" style={{ paddingTop: 50 }}>
        <Col xl={12}>
          <h2>Select which item to airdrop:</h2>

          <ArtSelector
            filter={artistFilter}
            selected={selectedNft}
            setSelected={items => {
              setSelectedNft(items);
            }}
            allowMultiple={false}
          >
            Select NFT
          </ArtSelector>
        </Col>
        <Col xl={12}>
          <h2>Import your csv</h2>
          <Dragger
            accept=".csv,.xlsx"
            style={{ padding: 20, background: 'rgba(255, 255, 255, 0.08)' }}
            multiple={false}
            customRequest={info => {
              // dont upload files here, handled outside of the control
              info?.onSuccess?.({}, null as any);
            }}
            fileList={csvFile ? [csvFile as any] : []}
            onChange={async info => {
              const file = info.file.originFileObj;

              if (!file) {
                return;
              }
              try {
                const csvDataParsed = Papa.parse(await file.text(), { header: true })
                setCsvFields(csvDataParsed.meta.fields)
                setCsvData(csvDataParsed.data)
                setCsvFile(file);
                setCsvError(undefined);
              } catch (e) {
                setCsvData(undefined);
                setCsvFields(undefined);
                setCsvFile(undefined);
                setCsvError(`${file.name} is not a valid CSV.`);
              }
            }}
          >
            <div className="ant-upload-drag-icon">
              <h3 style={{ fontWeight: 700 }}>
                Upload your CSV FILE (CSV, XLS, GIF, SVG)
              </h3>
            </div>
            {csvError ? (
              <Text type="danger">{csvError}</Text>
            ) : (
              <p className="ant-upload-text" style={{ color: '#6d6d6d' }}>
                Drag and drop, or click to browse
              </p>
            )}
          </Dragger>
          {csvFields && (
            <>
              <h2>Select your wallet address field</h2>
              <Select
                onSelect={setSelectedField}
                value={selectedField}
                bordered={false}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  width: '100%',
                  marginBottom: 10,
                }}
              >
                {csvFields.map((name, idx) => (
                  <Select.Option value={name as any} key={idx}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
              {(validAddresses.length > 0 || inValidAddresses.length > 0) && csvData && (
                <Row>
                  <Col xl={12}>
                    {validAddresses.length} Valid addresses
                  </Col>
                  <Col xl={12}>
                    {inValidAddresses.length} Invalid addresses
                  </Col>
                  <Col xl={12}>
                    {selectedNft.length > 0 && validAddresses.length > 0 &&
                    (notMintedAddresses.length > 0 ? (
                          <Button
                            type="primary"
                            size="large"
                            className="ant-btn secondary-btn"
                            disabled={false}
                            style={{ marginTop: 20, width: '100%' }}
                            onClick={() => sendNfts(true)}
                          >
                            Retry {notMintedAddresses.length} NFTS
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            size="large"
                            className="ant-btn secondary-btn"
                            disabled={false}
                            style={{ marginTop: 20, width: '100%' }}
                            onClick={() => sendNfts(false)}
                          >
                            Send {validAddresses.length} NFTS
                          </Button>
                        )
                    )}
                  </Col>
                </Row>
              )}
            </>
          )}
        </Col>
      </Row>
    </>
  );
};
