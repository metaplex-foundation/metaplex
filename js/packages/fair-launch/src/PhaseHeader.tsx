import * as anchor from '@project-serum/anchor';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PhaseCountdown } from './countdown';
import { toDate } from './utils';
import { FairLaunchAccount } from './fair-launch';
import { CandyMachineAccount } from './candy-machine';
import { useWallet } from '@solana/wallet-adapter-react';

export enum Phase {
  AnticipationPhase, // FL, AKA Phase 0
  SetPrice, // FL, AKA Phase 1
  GracePeriod, // FL, AKA Phase 2
  Lottery, // FL
  RaffleFinished, // FL, AKA Phase 3
  WaitForCM, // FL,
  Phase4,
  Unknown,
}

export function getPhase(
  fairLaunch: FairLaunchAccount | undefined,
  candyMachine: CandyMachineAccount | undefined,
): Phase {
  const curr = new Date().getTime();
  const phaseOne = toDate(fairLaunch?.state.data.phaseOneStart)?.getTime();
  const phaseOneEnd = toDate(fairLaunch?.state.data.phaseOneEnd)?.getTime();
  const phaseTwoEnd = toDate(fairLaunch?.state.data.phaseTwoEnd)?.getTime();
  const candyMachineGoLive = toDate(candyMachine?.state.goLiveDate)?.getTime();

  if (phaseOne && curr < phaseOne) {
    return Phase.AnticipationPhase;
  } else if (phaseOneEnd && curr <= phaseOneEnd) {
    return Phase.SetPrice;
  } else if (phaseTwoEnd && curr <= phaseTwoEnd) {
    return Phase.GracePeriod;
  } else if (
    !fairLaunch?.state.phaseThreeStarted &&
    phaseTwoEnd &&
    curr > phaseTwoEnd
  ) {
    return Phase.Lottery;
  } else if (
    (!fairLaunch || fairLaunch?.state.phaseThreeStarted) &&
    candyMachineGoLive &&
    curr > candyMachineGoLive
  ) {
    return Phase.Phase4;
  } else if (fairLaunch?.state.phaseThreeStarted) {
    if (!candyMachine) {
      return Phase.RaffleFinished;
    } else {
      return Phase.WaitForCM;
    }
  }
  return Phase.Unknown;
}

const Header = (props: {
  phaseName: string;
  desc: string;
  date: anchor.BN | undefined;
  status?: string;
}) => {
  const { phaseName, desc, date, status } = props;
  return (
    <Grid container justifyContent="center">
      <Grid xs={6} justifyContent="center" direction="column">
        <Typography variant="h5" style={{ fontWeight: 600 }}>
          {phaseName}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {desc}
        </Typography>
      </Grid>
      <Grid xs={6} container justifyContent="flex-end">
        <PhaseCountdown
          date={toDate(date)}
          style={{ justifyContent: 'flex-end' }}
          status={status || 'COMPLETE'}
        />
      </Grid>
    </Grid>
  );
};

type PhaseHeaderProps = {
  phase: Phase;
  fairLaunch?: FairLaunchAccount;
  candyMachine?: CandyMachineAccount;
  candyMachinePredatesFairLaunch: boolean;
  rpcUrl: string;
};

export const PhaseHeader = ({
  phase,
  fairLaunch,
  candyMachine,
  candyMachinePredatesFairLaunch,
  rpcUrl,
}: PhaseHeaderProps) => {
  const wallet = useWallet();
  console.log('D', candyMachine);
  console.log('Wallet', wallet);

  return (
    <>
      {phase === Phase.AnticipationPhase && (
        <Header
          phaseName={'Phase 0'}
          desc={'Anticipation Phase'}
          date={fairLaunch?.state.data.phaseOneStart}
        />
      )}
      {phase === Phase.SetPrice && (
        <Header
          phaseName={'Phase 1'}
          desc={'Set price phase'}
          date={fairLaunch?.state.data.phaseOneEnd}
        />
      )}

      {phase === Phase.GracePeriod && (
        <Header
          phaseName={'Phase 2'}
          desc={'Grace period'}
          date={fairLaunch?.state.data.phaseTwoEnd}
        />
      )}

      {phase === Phase.Lottery && (
        <Header
          phaseName={'Phase 3'}
          desc={'Raffle in progress'}
          date={fairLaunch?.state.data.phaseTwoEnd.add(
            fairLaunch?.state.data.lotteryDuration,
          )}
        />
      )}

      {phase === Phase.RaffleFinished && (
        <Header
          phaseName={'Phase 3'}
          desc={'Raffle finished!'}
          date={fairLaunch?.state.data.phaseTwoEnd}
        />
      )}

      {phase === Phase.WaitForCM && (
        <Header
          phaseName={'Phase 3'}
          desc={'Minting starts in...'}
          date={candyMachine?.state.goLiveDate}
        />
      )}

      {phase === Phase.Unknown && !candyMachine && (
        <Header
          phaseName={'Loading...'}
          desc={'Waiting for you to connect your wallet.'}
          date={undefined}
        />
      )}

      {phase === Phase.Phase4 && (
        <Header
          phaseName={candyMachinePredatesFairLaunch ? 'Phase 3' : 'Phase 4'}
          desc={'Candy Time 🍬 🍬 🍬'}
          date={candyMachine?.state.goLiveDate}
          status="LIVE"
        />
      )}
    </>
  );
};
