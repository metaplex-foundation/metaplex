import { cache, convert, getTokenName, NumericInput, TokenDisplay, useConnectionConfig, useUserAccounts } from '@oyster/common';
import React, { useCallback } from 'react';
import { Card, Select } from "antd";
// import "./index.less";

export function CurrencyInput(props: {
  mint?: string;
  amount?: string;
  title?: string;
  hideSelect?: boolean;
  onInputChange?: (val: number) => void;
  onMintChange?: (account: string) => void;
}) {
  const { tokens, tokenMap } = useConnectionConfig();
  const { userAccounts } = useUserAccounts();
  const mint = cache.getMint(props.mint as string);

  const userUiBalance = () => {
    const currentAccount = userAccounts?.find(
      (a) => a.info.mint.toBase58() === props.mint
    );
    if (currentAccount && mint) {
      return convert(currentAccount, mint);
    }

    return 0;
  };

  const handleClick = useCallback((e) => {
    console.log('--handle click', )
    if (props.onInputChange) {
      props.onInputChange(userUiBalance())
    }
  }, []);

  return (
    <Card
      className="ccy-input"
      style={{ borderRadius: 20, width: '100%', margin: 0 }}
    >
      <div className="ccy-input-header" style={{ paddingLeft: '10px', paddingBottom: '5px' }}>
        <div className="ccy-input-header-left">{props.title}</div>

        <div
          className="ccy-input-header-right"
          onClick={handleClick}
        >
          Balance: 0
          {/*Balance: {userUiBalance().toFixed(6)}*/}
        </div>
      </div>
      <div className="ccy-input-header" style={{ padding: "0px 10px 5px 7px" }}>
        <NumericInput
          value={props.amount}
          onChange={(val: any) => {
            if (props.onInputChange) {
              props.onInputChange(val);
            }
          }}
          style={{
            fontSize: 20,
            boxShadow: "none",
            borderColor: "transparent",
            outline: "transpaernt",
            minWidth: '50%',
            background: 'none',
            padding: 0
          }}
          placeholder="0.00"
        />
        <div className="ccy-input-header-right" style={{ minWidth: '50%' }}>
          {!props.hideSelect ? (
            <Select
              size="large"
              showSearch
              style={{ minWidth: 150 }}
              placeholder="CCY"
              value={props.mint}
              onChange={(item) => {
                if (props.onMintChange) {
                  props.onMintChange(item);
                }
              }}
              filterOption={(input, option) =>
                option?.name?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {/*{[...renderPopularTokens, ...renderAdditionalTokens]}*/}
            </Select>
          ) : (
            props.mint && (
              <TokenDisplay
                key={props.mint}
                name={getTokenName(tokenMap, props.mint)}
                mintAddress={props.mint}
                showBalance={true}
              />
            )
          )}
        </div>
      </div>
    </Card>
  );
}
