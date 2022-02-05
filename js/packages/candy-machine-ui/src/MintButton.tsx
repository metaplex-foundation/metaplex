import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import { CandyMachineAccount } from './candy-machine';
import { CircularProgress } from '@material-ui/core';
import { GatewayStatus, useGateway } from '@civic/solana-gateway-react';
import { useEffect, useState } from 'react';
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {findGatewayToken} from "@identity.com/solana-gateway-ts";

export const CTAButton = styled(Button)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`; // add your own styles here

export const MintButton = ({
                             onMint,
                             candyMachine,
                             isMinting,
                             rpcUrl
  isActive,
                           }: {
  onMint: () => Promise<void>;
  candyMachine?: CandyMachineAccount;
  isMinting: boolean;
  isActive: boolean;
  rpcUrl: string
}) => {
  const { requestGatewayToken, gatewayStatus } = useGateway();
  const [clicked, setClicked] = useState(false);

  const wallet = useWallet();
  const connection = useConnection();

  useEffect(() => {
    if (gatewayStatus === GatewayStatus.ACTIVE && clicked) {
      onMint();
      setClicked(false);
    }
  }, [gatewayStatus, clicked, setClicked, onMint]);

  const getMintButtonContent = () => {
    if (candyMachine?.state.isSoldOut) {
      return 'SOLD OUT';
    } else if (isMinting) {
      return <CircularProgress />;
    } else if (
      candyMachine?.state.isPresale ||
      candyMachine?.state.isWhitelistOnly
    ) {
      return 'WHITELIST MINT';
    } else if (clicked && candyMachine?.state.gatekeeper) {
      return <CircularProgress />;
    }

    return 'MINT';
  };

  return (
    <CTAButton
      disabled={clicked || isMinting || !isActive}
      onClick={async () => {
        setClicked(true);
        if (candyMachine?.state.isActive && candyMachine?.state.gatekeeper) {
          //candyMachine.state.gatekeeper.gatekeeperNetwork === civicNetwork
          if(true){
            if (gatewayStatus === GatewayStatus.ACTIVE) {
              setClicked(true);
            } else {
              await requestGatewayToken();
            }
          }
          //candyMachine.state.gatekeeper.gatekeeperNetwork === encoreNetwork
          else if (true){
            const gatewayToken = await findGatewayToken(
              connection.connection,
              wallet.publicKey!,
              candyMachine!.state.gatekeeper!.gatekeeperNetwork
            );

            if (gatewayToken) {
              await onMint();
              setClicked(false);
            } else {
              window.open(`https://encore.fans/verify-hooman?network=${rpcUrl}&gkNetwork=${candyMachine!.state.gatekeeper}`, '_blank')
            }
          }
        } else {
          await onMint();
          setClicked(false);
        }
      }}
      variant="contained"
    >
      {getMintButtonContent()}
    </CTAButton>
  );
};
