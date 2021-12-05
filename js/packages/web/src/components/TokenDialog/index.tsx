import { PublicKey } from "@solana/web3.js";
import React, { useState } from "react";
import { useSwappableTokens, useTokenList } from "../../contexts/tokenList";
import { Row, Col, Typography, Modal, Tabs, Input, List } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { TokenInfo } from "@solana/spl-token-registry";
import { TokenCircle } from "../Custom";
import { MetaplexModal, shortenAddress, toPublicKey } from "@oyster/common";

const { Search } = Input;

const { TabPane } = Tabs;

export enum TokenViewState {
  Main = '0',
  Wormhole = '1',
  Sollet = '2',
}

export function TokenButton({
  mint,
  onClick,
}: {
  mint: PublicKey;
  onClick: () => void;
}) {
  const tokenMap = useTokenList().mainnetTokens;
  let tokenInfo = tokenMap.filter(t => t.address == mint.toBase58())[0];

  return (
    <Row onClick={onClick} className={'token-button'} justify='space-between'>
      <Col>
        <Row>
          <TokenCircle iconSize={40} iconFile={tokenInfo?.logoURI} style={{ marginTop: 2.5 }} />
          <TokenName mint={mint} style={{ fontSize: 14, fontWeight: 700 }} />
        </Row>
      </Col>
      <Col>
        <DownOutlined style={{ marginLeft: 10, fontWeight: 700, }} />
      </Col>
    </Row>
  );
}

export default function TokenDialog({
  open,
  onClose,
  setMint,
}: {
  open: boolean;
  onClose: () => void;
  setMint: (mint: PublicKey) => void;
}) {
  const [tabSelection, setTabSelection] = useState(TokenViewState.Main);
  const [tokenFilter, setTokenFilter] = useState("");
  const filter = tokenFilter.toLowerCase();
  const { swappableTokens, swappableTokensSollet, swappableTokensWormhole } = useSwappableTokens();
  const selectedTokens =
    tabSelection === TokenViewState.Main
      ? swappableTokens
      : tabSelection === TokenViewState.Wormhole
        ? swappableTokensWormhole
        : swappableTokensSollet;
  let tokens =
    tokenFilter === ""
      ? selectedTokens
      : selectedTokens.filter(
        (t) =>
          t.symbol.toLowerCase().startsWith(filter) ||
          t.name.toLowerCase().startsWith(filter) ||
          t.address.toLowerCase().startsWith(filter)
      );

  const validateTokenMint = (quoteMintAddress: string) => {

    // try to convert to publicKey and check if it is on curve
    let quoteMintAddressOnCurve = false
    try {
      quoteMintAddressOnCurve = PublicKey.isOnCurve(toPublicKey(quoteMintAddress).toBuffer().slice(0, 32))
    } catch {
      console.log("Not an ed25519 curve pubkey")
    }

    if (quoteMintAddressOnCurve) {
      console.log("MINT OK")
      setMint(toPublicKey(quoteMintAddress))
      onClose()
    }

  }

  return (
    <MetaplexModal
      visible={open}
      onCancel={onClose}
      bodyStyle={{ padding: '25px 0 0 0' }}
    >

      <Col className={'dialog-header'}>
        <Typography style={{ paddingBottom: "16px", textAlign: 'center', textTransform: 'uppercase', fontWeight: 600 }}>
          Select a token as your auction mint
        </Typography>
        <Input
          autoFocus
          className="input text-field"
          placeholder="Search token mints"
          allowClear
          value={tokenFilter}
          onChange={(e) => setTokenFilter(e.target.value)}
        />
      </Col>
      <div className={'dialog-content'}>
        <List style={{padding: '16px 0'}}>
          {tokens.map((tokenInfo: TokenInfo) => (
            <TokenListItem
              key={tokenInfo.address}
              tokenInfo={tokenInfo}
              onClick={(mint) => {
                setMint(mint);
                console.log("SET MINT TO", mint.toBase58())
                onClose();
              }}
            />
          ))}
        </List>
        <Search
          enterButton="Go!"
          className="input search-text-field"
          placeholder="Can't find your token? set it here!"
          allowClear
          size="large"
          onSearch={(e) => validateTokenMint(e)}
        />
      </div>

      <Tabs
        activeKey={tabSelection}
        onTabClick={key => setTabSelection(key as TokenViewState)}
        className={'token-tabs'}
      >
        <TabPane
          key={TokenViewState.Main}
          className={'token-tab'}
          /*  classes={{ selected: 'tab-selected' }} */
          tab={<span className="tab-title">Main</span>}
        />
        <TabPane
          key={TokenViewState.Wormhole}
          className={'token-tab'}
          /* classes={{ selected: 'tab-selected' }} */
          tab={<span className="tab-title">Wormhole</span>}
        />
        <TabPane
          key={TokenViewState.Sollet}
          className={'token-tab'}
          /* classes={{ selected: 'tab-selected' }} */
          tab={<span className="tab-title">Sollet</span>}
        />
      </Tabs>
    </MetaplexModal>
  );
}

function TokenListItem({
  tokenInfo,
  onClick,
}: {
  tokenInfo: TokenInfo;
  onClick: (mint: PublicKey) => void;
}) {
  const mint = new PublicKey(tokenInfo.address);
  return (
    <List.Item
      onClick={() => onClick(mint)}
      className={'token-list-item'}
    >
      <TokenIcon mint={mint} style={{ width: "30px", borderRadius: "15px" }} />
      <TokenName mint={mint} />
    </List.Item>
  );
}

export function TokenIcon({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenMap = useTokenList().tokenMap;
  let tokenInfo = tokenMap.get(mint.toString());
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {tokenInfo?.logoURI ? (
        <img alt="Logo" style={style} src={tokenInfo?.logoURI} />
      ) : (
        <div style={style}></div>
      )}
    </div>
  );
}

function TokenName({ mint, style }: { mint: PublicKey; style?: any}) {
  const tokenMap = useTokenList().tokenMap;
  let tokenInfo = tokenMap.get(mint.toString());
  let tokenSymbol = tokenInfo? tokenInfo.symbol: "CUSTOM"
  let tokenName = tokenInfo? tokenInfo.name: "Custom Token"

  return (
    <div style={{ marginLeft: "16px", overflow: 'hidden' }}>
      <div style={{ fontWeight: 500, color: 'white', }}>
        {tokenInfo? tokenName:`${shortenAddress(mint.toBase58())}`}
      </div>
      <div color="textSecondary" style={{ fontSize: "14px", color: '#797A8C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', }}>
        {tokenName}
      </div>
    </div>
  );
}