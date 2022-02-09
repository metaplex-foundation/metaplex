import { CircularProgress, Container, Link } from '@material-ui/core';
import { useState } from 'react';
import { FairLaunchAccount, receiveRefund } from './fair-launch';
import MuiDialogContent from '@material-ui/core/DialogContent';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toDate } from './utils';
import Countdown from 'react-countdown';
import Dialog from '@material-ui/core/Dialog';
import { CTAButton } from './MintButton';
import { AlertState } from './utils';

import * as anchor from '@project-serum/anchor';

type AntiRugProps = {
  fairLaunch: FairLaunchAccount;
  isMinting: [boolean, (val: boolean) => void];
  anchorWallet?: anchor.Wallet;
  setAlertState: (val: AlertState) => void;
};
export const AntiRug = ({
  fairLaunch,
  isMinting: [isMinting, setIsMinting],
  anchorWallet,
  setAlertState,
}: AntiRugProps) => {
  const [antiRugPolicyOpen, setAnitRugPolicyOpen] = useState(false);

  const onRugRefund = async () => {
    if (!anchorWallet) {
      return;
    }

    console.log('refund');
    try {
      setIsMinting(true);
      await receiveRefund(anchorWallet, fairLaunch);
      setIsMinting(false);
      setAlertState({
        open: true,
        message:
          'Congratulations! You have received a refund. This is an irreversible action.',
        severity: 'success',
      });
    } catch (e) {
      console.log(e);
      setIsMinting(false);
      setAlertState({
        open: true,
        message: 'Something went wrong.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Container maxWidth="xs" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <Link
            component="button"
            variant="body2"
            color="textSecondary"
            align="right"
            onClick={() => {
              setAnitRugPolicyOpen(true);
            }}
          >
            Anti-Rug Policy
          </Link>
        </div>
      </Container>
      <Dialog
        open={antiRugPolicyOpen}
        onClose={() => {
          setAnitRugPolicyOpen(false);
        }}
        PaperProps={{
          style: { backgroundColor: '#222933', borderRadius: 6 },
        }}
      >
        <MuiDialogContent style={{ padding: 24 }}>
          {!fairLaunch.state.data.antiRugSetting && (
            <span>This Fair Launch has no anti-rug settings.</span>
          )}
          {fairLaunch.state.data.antiRugSetting &&
            fairLaunch.state.data.antiRugSetting.selfDestructDate && (
              <div>
                <h3>Anti-Rug Policy</h3>
                <p>
                  This raffle is governed by a smart contract to prevent the
                  artist from running away with your money.
                </p>
                <p>How it works:</p>
                This project will retain{' '}
                {fairLaunch.state.data.antiRugSetting.reserveBp / 100}% (◎{' '}
                {(fairLaunch.treasury *
                  fairLaunch.state.data.antiRugSetting.reserveBp) /
                  (LAMPORTS_PER_SOL * 10000)}
                ) of the pledged amount in a locked state until all but{' '}
                {fairLaunch.state.data.antiRugSetting.tokenRequirement.toNumber()}{' '}
                NFTs (out of up to{' '}
                {fairLaunch.state.data.numberOfTokens.toNumber()}) have been
                minted.
                <p>
                  If more than{' '}
                  {fairLaunch.state.data.antiRugSetting.tokenRequirement.toNumber()}{' '}
                  NFTs remain as of{' '}
                  {toDate(
                    fairLaunch.state.data.antiRugSetting.selfDestructDate,
                  )?.toLocaleDateString()}{' '}
                  at{' '}
                  {toDate(
                    fairLaunch.state.data.antiRugSetting.selfDestructDate,
                  )?.toLocaleTimeString()}
                  , you will have the option to get a refund of{' '}
                  {fairLaunch.state.data.antiRugSetting.reserveBp / 100}% of the
                  cost of your token.
                </p>
                {fairLaunch.ticket?.data &&
                  !fairLaunch.ticket?.data.state.withdrawn && (
                    <CTAButton
                      onClick={onRugRefund}
                      variant="contained"
                      disabled={
                        !!!fairLaunch.ticket.data ||
                        !fairLaunch.ticket.data.state.punched ||
                        Date.now() / 1000 <
                          fairLaunch.state.data.antiRugSetting.selfDestructDate.toNumber()
                      }
                    >
                      {isMinting ? (
                        <CircularProgress />
                      ) : Date.now() / 1000 <
                        fairLaunch.state.data.antiRugSetting.selfDestructDate.toNumber() ? (
                        <span>
                          Refund in...
                          <Countdown
                            date={toDate(
                              fairLaunch.state.data.antiRugSetting
                                .selfDestructDate,
                            )}
                          />
                        </span>
                      ) : (
                        'Refund'
                      )}
                      {}
                    </CTAButton>
                  )}
                <div style={{ textAlign: 'center', marginTop: '-5px' }}>
                  {fairLaunch.ticket?.data &&
                    !fairLaunch.ticket?.data?.state.punched && (
                      <small>
                        You currently have a ticket but it has not been punched
                        yet, so cannot be refunded.
                      </small>
                    )}
                </div>
              </div>
            )}
        </MuiDialogContent>
      </Dialog>
    </>
  );
};
