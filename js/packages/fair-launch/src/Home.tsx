import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Countdown from 'react-countdown';
import {
  CircularProgress,
  Container,
  IconButton,
  Link,
  Slider,
  Snackbar,
} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import { createStyles, Theme, withStyles } from '@material-ui/core/styles';
import Backdrop from '@material-ui/core/Backdrop';
import { PhaseCountdown } from './countdown';
import Dialog from '@material-ui/core/Dialog';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import CloseIcon from '@material-ui/icons/Close';

import Alert from '@material-ui/lab/Alert';

import * as anchor from '@project-serum/anchor';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';

import {
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from './candy-machine';

import {
  FairLaunchAccount,
  FairLaunchTicket,
  getFairLaunchLotteryBitmap,
  getFairLaunchState,
  punchTicket,
  purchaseTicket,
  withdrawFunds,
} from './fair-launch';

import {
  AnchorProgram,
  formatNumber,
  getFairLaunchTicket,
  toDate,
} from './utils';

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604AE5 0%, #813EEE 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;


`; // add your styles here

const dialogStyles: any = (theme: Theme) =>
  createStyles({
    root: {
      margin: 0,
      padding: theme.spacing(2),
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },
  });


const ValueSlider = styled(Slider)({
  color: '#C0D5FE',
  height: 8,
  '& > *': {
    height: 4,

  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    marginTop: -10,
    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    border: '2px solid currentColor',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    '& > *': {

    background: 'linear-gradient(180deg, #604AE5 0%, #813EEE 100%)',
    },
    lineHeight: 1.2,
    fontSize: 12,
    padding: 0,
    width: 32,
    height: 32,
    marginLeft: 9
  },
});

const LimitedBackdrop = withStyles({
  root: {
    position: 'absolute',
    zIndex: 1,
  },
})(Backdrop);

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  fairLaunchId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const FAIR_LAUNCH_LOTTERY_SIZE =
  8 + // discriminator
  32 + // fair launch
  1 + // bump
  8; // size of bitmask ones

const isWinner = (
  phaseThree: boolean | undefined,
  lottery: Uint8Array | null,
  sequence: anchor.BN | undefined,
): boolean => {
  if (!lottery || !lottery.length || !sequence || !phaseThree) {
    return false;
  }

  const myByte =
    lottery[FAIR_LAUNCH_LOTTERY_SIZE + Math.floor(sequence.toNumber() / 8)];

  const positionFromRight = 7 - (sequence.toNumber() % 8);
  const mask = Math.pow(2, positionFromRight);
  const isWinner = myByte & mask;
  return isWinner > 0;
};

enum LotteryState {
  Brewing = 'Brewing',
  Finished = 'Finished',
  PastDue = 'Past Due',
}

const getLotteryState = (
  phaseThree: boolean | undefined,
  lottery: Uint8Array | null,
  lotteryDuration: anchor.BN,
  phaseTwoEnd: anchor.BN,
): LotteryState => {
  if (
    !phaseThree &&
    (!lottery || lottery.length === 0) &&
    phaseTwoEnd.add(lotteryDuration).lt(new anchor.BN(Date.now() / 1000))
  ) {
    return LotteryState.PastDue;
  } else if (phaseThree) {
    return LotteryState.Finished;
  } else {
    return LotteryState.Brewing;
  }
};

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [contributed, setContributed] = useState(0);
  const [ticket, setTicket] = useState<FairLaunchTicket | null>(null);
  const [treasury, setTreasury] = useState<number | null>(null);
  const [lottery, setLottery] = useState<Uint8Array | null>(null);

  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet, wallet.publicKey]);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const [fairLaunch, setFairLaunch] = useState<FairLaunchAccount>();
  const [startDate, setStartDate] = useState(new Date(props.startDate));
  const [candyMachine, setCandyMachine] = useState<AnchorProgram>();
  const [howToOpen, setHowToOpen] = useState(false);

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury,
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          'singleGossip',
          false,
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (anchorWallet?.publicKey) {
        try {
          const balance = await props.connection.getBalance(
            anchorWallet.publicKey,
          );
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch {
          // ignore connection error
        }
      }
    })();
  }, [anchorWallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (!anchorWallet) {
        return;
      }

      try {
        const state = await getFairLaunchState(
          anchorWallet,
          props.fairLaunchId,
          props.connection,
        );

        setFairLaunch(state);
        const [fairLaunchTicket, _] = await getFairLaunchTicket(
          state.state.tokenMint,
          anchorWallet.publicKey,
        );

        try {
          const ticket: FairLaunchTicket | null =
            (await state.program.account.fairLaunchTicket.fetch(
              fairLaunchTicket,
            )) as FairLaunchTicket | null;
          setTicket(ticket);
        } catch (e) {
          console.log('Could not find fair launch ticket.');
        }

        const treasury = await state.program.provider.connection.getBalance(
          state.state.treasury,
        );

        setTreasury(treasury);
        try {
          const fairLaunchLotteryBitmap = (
            await getFairLaunchLotteryBitmap(
              //@ts-ignore
              state.state.tokenMint,
            )
          )[0];

          const fairLaunchLotteryBitmapObj =
            await state.program.provider.connection.getAccountInfo(
              fairLaunchLotteryBitmap,
            );

          setLottery(new Uint8Array(fairLaunchLotteryBitmapObj?.data || []));
        } catch (e) {
          console.log('Could not find fair launch lottery.');
          console.log(e);
        }

        console.log();
      } catch (e) {
        console.log('Problem getting fair launch state');
        console.log(e);
      }

      try {
        const { candyMachine, goLiveDate, itemsRemaining } =
          await getCandyMachineState(
            anchorWallet,
            props.candyMachineId,
            props.connection,
          );
        setIsSoldOut(itemsRemaining === 0);
        setStartDate(goLiveDate);
        setCandyMachine(candyMachine);
      } catch {
        console.log('Problem getting candy machine state');
      }
    })();
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const min = formatNumber.asNumber(fairLaunch?.state.data.priceRangeStart);
  const max = formatNumber.asNumber(fairLaunch?.state.data.priceRangeEnd);
  const step = formatNumber.asNumber(fairLaunch?.state.data.tickSize);
  const median = formatNumber.asNumber(fairLaunch?.state.currentMedian);
  const marks = [
    {
      value: min || 0,
      label: `${min} SOL`,
    },
    // TODO:L
    {
      value: median || 0,
      label: `${median}`,
    },
    // display user comitted value
    // {
    //   value: 37,
    //   label: '37°C',
    // },
    {
      value: max || 0,
      label: `${max} SOL`,
    },
  ].filter(_ => _ !== undefined && _.value !== 0) as any;

  const onDeposit = () => {
    if (!anchorWallet) {
      return;
    }

    console.log('deposit');

    purchaseTicket(contributed, anchorWallet, fairLaunch, ticket);
  };

  const onRefundTicket = () => {
    if (!anchorWallet) {
      return;
    }

    console.log('refund');

    purchaseTicket(0, anchorWallet, fairLaunch, ticket);
  };

  const onPunchTicket = () => {
    if (!anchorWallet || !fairLaunch || !ticket) {
      return;
    }

    console.log('punch');

    punchTicket(anchorWallet, fairLaunch, ticket);
  };

  const onWithdraw = () => {
    if (!anchorWallet) {
      return;
    }

    console.log('withdraw');

    withdrawFunds(contributed, anchorWallet, fairLaunch);
  };

  const [isPhase1Active, setIsPhase1Active] = useState(
    (toDate(fairLaunch?.state.data.phaseOneStart) || Date.now()) <= Date.now(),
  );

  return (
    <Container style={{ marginTop: 100 }}>
      <Container maxWidth="sm" style={{ position: 'relative' }}>
        {/* Display timer before the drop */}
        <LimitedBackdrop open={!isPhase1Active}>
          <Grid container direction="column" alignItems="center">
            <Typography component="h2" color="textPrimary">
              Raffle starts
            </Typography>
            <PhaseCountdown
              date={toDate(fairLaunch?.state.data.phaseOneStart)}
              onComplete={() => setIsPhase1Active(true)}
              status="Completed"
            />
          </Grid>
        </LimitedBackdrop>
        <Paper style={{ padding: 24, backgroundColor: '#151A1F', borderRadius: 6 }}>
          <Grid container justifyContent="center" direction="column">
            <Grid container justifyContent="center">
              <Grid xs={6} justifyContent="center" direction="column">
                <Typography variant="h5">Phase 1</Typography>
                <Typography variant="body1" color="textSecondary">Set price phase</Typography>
              </Grid>
              <Grid xs={6} container justifyContent="flex-end">
                <PhaseCountdown
                  date={toDate(fairLaunch?.state.data.phaseOneEnd)}
                  style={{ justifyContent: 'flex-end' }}
                  status="COMPLETE"
                />
              </Grid>
            </Grid>

            {ticket && <Grid container direction="column" justifyContent="center" alignItems="center" style={{ height: 200}}>
              <Typography>Your bid</Typography>
              <Typography>
                {formatNumber.format(
                  (ticket?.amount.toNumber() || 0) / LAMPORTS_PER_SOL,
                )}{' '}
                SOL
              </Typography>
            </Grid>}

            <Grid style={{ marginTop: 40, marginBottom: 20 }}>
              <ValueSlider
                min={min}
                marks={marks}
                max={max}
                step={step}
                value={contributed}
                onChange={(ev, val) => setContributed(val as any)}
                valueLabelDisplay="auto"
                style={{ width: 'calc(100% - 40px)', marginLeft: 20, height: 30 }}
              />
            </Grid>

            {fairLaunch?.state.data.phaseTwoEnd.lt(
              new anchor.BN(Date.now() / 1000),
            ) && !fairLaunch.state.phaseThreeStarted ? (
              <div>
                <p>
                  We're now in the lottery. No further action is required on
                  your part until it is over.
                </p>
                Lottery State:{' '}
                {getLotteryState(
                  fairLaunch?.state.phaseThreeStarted,
                  lottery,
                  fairLaunch?.state.data.lotteryDuration,
                  fairLaunch?.state.data.phaseTwoEnd,
                )}
              </div>
            ) : (
              <div>
                {!fairLaunch?.state.phaseThreeStarted && (
                  <MintButton onClick={onDeposit} variant="contained">
                    {!ticket ? 'Place a bid' : 'Adjust your bid'}
                  </MintButton>
                )}

                {isWinner(
                  fairLaunch?.state.phaseThreeStarted,
                  lottery,
                  ticket?.seq,
                ) && (
                  <MintButton
                    onClick={onPunchTicket}
                    variant="contained"
                    disabled={ticket?.state.punched !== undefined}
                  >
                    Punch Ticket
                  </MintButton>
                )}

                {fairLaunch?.state.phaseThreeStarted &&
                  !isWinner(
                    fairLaunch?.state.phaseThreeStarted,
                    lottery,
                    ticket?.seq,
                  ) && (
                    <MintButton
                      onClick={onRefundTicket}
                      variant="contained"
                      disabled={ticket?.state.withdrawn !== undefined}
                    >
                      Refund Ticket
                    </MintButton>
                  )}
              </div>
            )}

            <Grid container justifyContent="center" color="textSecondary">
              <Link
                  component="button"
                  variant="body2"
                  color="textSecondary"
                  align="center"
                  onClick={() => {
                    setHowToOpen(true)
                  }}
                >
                  How this raffles works
                </Link>
            </Grid>
            <Dialog open={howToOpen} onClose={() => setHowToOpen(false)} PaperProps={{ style: { backgroundColor: '#222933', borderRadius: 6 } }}>
              <MuiDialogTitle disableTypography style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'  }} >
                <Link
                  component="button"
                  variant="h6"
                  color="textSecondary"
                  onClick={() => {
                    setHowToOpen(true)
                  }}
                >
                  How it works
                </Link>
                <IconButton aria-label="close" className={dialogStyles.closeButton} onClick={() => setHowToOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </MuiDialogTitle>
              <MuiDialogContent>
                <Typography variant="h6">Phase 1 - Set the fair price:</Typography>
                <Typography gutterBottom color="textSecondary">
                  Enter a bid in the range provided by the artist. The median of all bids will be the "fair" price of the lottery ticket.
                </Typography>
                <Typography  variant="h6">Phase 2 - Grace period:</Typography>
                <Typography gutterBottom color="textSecondary">
                  If your bid was at or above the fair price, you automatically get a raffle ticket at that price. There's nothing else you need to do. If your bid is below the median price, you can still opt in at the fair price during this phase.
                </Typography>
                <Typography variant="h6">Phase 3 - The Lottery:</Typography>
                <Typography gutterBottom color="textSecondary">
                  Everyone who got a raffle ticket at the fair price is entered to win an NFT.
                  If you win an NFT, congrats. If you don’t, no worries, your SOL will go right back into your wallet.
                </Typography>
              </MuiDialogContent>
            </Dialog>

            {/* {wallet.connected && (
              <p>
                Address: {shortenAddress(wallet.publicKey?.toBase58() || '')}
              </p>
            )}

            {wallet.connected && (
              <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
            )} */}
          </Grid>
        </Paper>
      </Container>

      <Container maxWidth="sm" style={{ position: 'relative', marginTop: 10 }}>
        <Paper style={{ padding: 24, backgroundColor: '#151A1F', borderRadius: 6 }}>
          <Grid container justifyContent="center" direction="row">
            <Grid xs={6} justifyContent="center" direction="column">
              <Typography>Phase 2</Typography>
              <Typography>Raffle</Typography>
            </Grid>
            <Grid xs={6}>
              <PhaseCountdown
                date={toDate(fairLaunch?.state.data.phaseTwoEnd)}
                start={toDate(fairLaunch?.state.data.phaseTwoEnd)}
                end={toDate(fairLaunch?.state.data.phaseTwoEnd)}
                style={{ justifyContent: 'flex-end' }}
              />
            </Grid>
          </Grid>

          <MintContainer>
            {!wallet.connected ? (
              <ConnectButton>Connect Wallet</ConnectButton>
            ) : (
              <MintButton
                disabled={isSoldOut || isMinting || !isActive}
                onClick={onMint}
                variant="contained"
              >
                {isSoldOut ? (
                  'SOLD OUT'
                ) : isActive ? (
                  isMinting ? (
                    <CircularProgress />
                  ) : (
                    'MINT'
                  )
                ) : (
                  <Countdown
                    date={startDate}
                    onMount={({ completed }) => completed && setIsActive(true)}
                    onComplete={() => setIsActive(true)}
                    renderer={renderCounter}
                  />
                )}
              </MintButton>
            )}
          </MintContainer>
        </Paper>
      </Container>

      <Container maxWidth="sm" style={{ position: 'relative', marginTop: 10 }}>
        <div  style={{ margin: 20}}>
          <Grid container direction="row" wrap="nowrap">
            <Grid container md={4} direction="column">
              <Typography variant="body2" color="textSecondary">Bids</Typography>
              <Typography variant="h6" color="textPrimary" style={{ fontWeight: 'bold' }}>
                {fairLaunch?.state.numberTicketsSold.toNumber() || 0}
              </Typography>
            </Grid>
            <Grid container md={4} direction="column">
              <Typography variant="body2" color="textSecondary">Median bid</Typography>
              <Typography variant="h6" color="textPrimary" style={{ fontWeight: 'bold' }}>
                {formatNumber.format(median)} SOL
              </Typography>
            </Grid>
            <Grid container md={4} direction="column">
              <Typography variant="body2" color="textSecondary">Total raised</Typography>
              <Typography variant="h6" color="textPrimary" style={{ fontWeight: 'bold' }}>
                {formatNumber.format((treasury || 0) / LAMPORTS_PER_SOL)} SOL
              </Typography>
            </Grid>
          </Grid>
        </div>
      </Container>
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
