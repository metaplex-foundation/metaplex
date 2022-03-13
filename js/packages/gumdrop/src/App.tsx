import React from 'react';
import { BrowserRouter, Link, Route, Switch } from 'react-router-dom';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Link as HyperLink, Stack } from '@mui/material';

import './App.css';
import { useColorMode } from './contexts';
import { Header } from './components/Header/Header';
import { Claim } from './components/Claim';
import { Close } from './components/Close';
import { Create } from './components/Create';

const WHITESPACE = '\u00A0';

const About = () => {
  const summary = (
    <Stack spacing={1}>
      <div>
        The Gumdrop program leverages the Solana blockchain and merkle trees to
        facilitate airdrops to a large number of whitelisted users at a low cost
        to creators.
      </div>

      <div>
        Various ecosystem projects want to ensure early followers and supporters
        gain access to project assets whether they be tokens, NFTs, or others.
        Simultaneously, capitalization of these assets should not incur undue
        costs or operational overhead to the creators. There are several ways to
        achieve such a setup and Gumdrop offers one that integrates with
        existing Solana and Metaplex ecosystem programs.
      </div>

      <div>
        Gumdrop solves this efficient-airdrop issue by utilizing a
        space-efficient hash structure (the merkle tree) such that an on-chain
        program can validate whether the user is part of a whitelist. This uses
        a pull-based paradigm to shift the burden from creators, sending
        airdrops or pre-minting NFTs, to recipients, that can choose to claim
        their portion or leave it for general adoption.
      </div>

      <div>
        The approach, originally pioneered for token airdrops by{' '}
        <HyperLink
          href="https://github.com/Uniswap/merkle-distributor"
          underline="none"
        >
          Uniswap
        </HyperLink>{' '}
        and ported to Solana by{WHITESPACE}
        <HyperLink
          href="https://github.com/saber-hq/merkle-distributor"
          underline="none"
        >
          Saber
        </HyperLink>
        , is extended to allow pre-minting a Candy Machine or printing editions
        of a master copy. Moreover, Gumdrop allows creators to directly send
        whitelisted users a drop reclamation link by building the tree with
        off-chain handles (e.g email, discord, etc) and allowing the user to
        redeem into any wallet.
      </div>
    </Stack>
  );

  const create = (
    <Stack spacing={1}>
      <Link to={`${process.env.REACT_APP_WEB_HOME}/create`}>CREATION</Link>

      <div>
        Creation builds a whitelist of users that can claim either existing
        fungible tokens or directly mint from a pre-sale Candy Machine. See a
        full explanation on the{' '}
        <HyperLink
          href="https://docs.metaplex.com/airdrops/create-gumdrop"
          underline="none"
        >
          metaplex docs
        </HyperLink>
      </div>

      <div>
        Click{' '}
        <HyperLink
          href={`data:text/plain;charset=utf-8,${JSON.stringify(
            require('./example.json'),
          )}`}
          download="example.json"
          underline="none"
        >
          here
        </HyperLink>{' '}
        for an example distribution list with emails.
      </div>
    </Stack>
  );

  const claim = (
    <Stack spacing={1}>
      <Link to={`${process.env.REACT_APP_WEB_HOME}/claim`}>CLAIMS</Link>

      <div>
        Claims are redeemed through a URL with query parameters holding
        claim-specific keys. Claimants will need to verify ownership of the
        specified handle by answering a OTP challenge and pay the rent and
        minting fees if applicable.
      </div>
    </Stack>
  );

  const close = (
    <Stack spacing={1}>
      <Link to={`${process.env.REACT_APP_WEB_HOME}/close`}>CLOSING</Link>

      <div>
        Closing the Gumdrop cleans up the on-chain state and allows creators to
        recycle any lamports held for rent-exemption after the airdrop is
        complete.
      </div>

      <div>
        When closing a Candy Machine-integrated distributor, update authority
        will be transferred back to the wallet owner.
      </div>
    </Stack>
  );

  const steps = [
    { name: 'summary', inner: summary },
    { name: 'create', inner: create },
    { name: 'claim', inner: claim },
    { name: 'close', inner: close },
  ];
  return (
    <Stack alignContent="left" textAlign="left" spacing={2}>
      {steps.map((s, idx) => (
        <div key={idx}>{s.inner}</div>
      ))}
    </Stack>
  );
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
};

// eslint-disable-next-line
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = React.useState(
    getWindowDimensions(),
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(getWindowDimensions());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
};

function App() {
  const colorModeCtx = useColorMode();

  React.useEffect(() => {}, [colorModeCtx.mode]);

  const theme = React.useMemo(() => {
    let mode;
    if (colorModeCtx.mode === 'dark' || !colorModeCtx.mode) {
      mode = 'dark';
    } else {
      mode = 'light';
    }

    return createTheme({
      palette: {
        mode,
      },
    });
  }, [colorModeCtx.mode]);

  const { width } = useWindowDimensions();

  return (
    <div className="App" style={{ backgroundColor: 'transparent' }}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <CssBaseline />
          <Header narrow={width < 670} />
          <Box
            maxWidth="60ch"
            width="calc(100% - 60px)"
            style={{
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <Box height="40px" />
            <Switch>
              <Route
                exact
                path={`${process.env.REACT_APP_WEB_HOME}/create`}
                component={Create}
              />
              <Route
                exact
                path={`${process.env.REACT_APP_WEB_HOME}/claim`}
                component={Claim}
              />
              <Route
                exact
                path={`${process.env.REACT_APP_WEB_HOME}/close`}
                component={Close}
              />
              <Route
                exact
                path={`${process.env.REACT_APP_WEB_HOME}/`}
                component={About}
              />
            </Switch>
            <Box height="80px" />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
