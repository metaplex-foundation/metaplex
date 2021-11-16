import React from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Switch,
} from "react-router-dom";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Link as HyperLink,
  Stack,
} from "@mui/material";

import "./App.css";
import {
  useColorMode,
} from "./contexts";
import { Header } from "./components/Header/Header";
import { Claim } from "./components/Claim";
import { Close } from "./components/Close";
import { Create } from "./components/Create";

const WHITESPACE = "\u00A0";

const About = () => {
  const summary = (
    <Stack spacing={1}>
      <div>
      The Gumdrop program leverages the Solana blockchain and merkle trees to
      facilitate airdrops to a large number of whitelisted users at a low cost
      to creators.
      </div>

      <div>
      In the Solana ecosystem, the cost of token airdrops is currently largely
      due to rent costs being{WHITESPACE}
      <HyperLink
        href="https://docs.solana.com/implemented-proposals/rent"
        underline="none"
      >
        &quot;fixed at the genesis&quot;
      </HyperLink>
      . With the large increase in SOLUSD since genesis, rent costs when
      creating accounts for thousands of users have duly skyrocketed.
      </div>

      <div>
      Simultaneously, NFT projects often have a presale to early project
      followers and contributors. However, the candy-machine doesn&apos;t have the
      ability to grant early minting to a whitelisted subset of wallets while
      also using the same asset configuration for open launch.
      </div>

      <div>
      Gumdrop (originally pioneered for token airdrops by{" "}
      <HyperLink
        href="https://github.com/Uniswap/merkle-distributor"
        underline="none"
      >
        Uniswap
      </HyperLink>
      {" "}and ported to Solana by{WHITESPACE}
      <HyperLink
        href="https://github.com/saber-hq/merkle-distributor"
        underline="none"
      >
        Saber
      </HyperLink>) solves both these issues by building a space-efficient hash
      structure (the merkle tree) such that an on-chain program can validate
      whether the user is part of a whitelist. Moreover, Gumdrop
      allows creators to directly send whitelisted users an airdrop reclamation
      link by building the tree with off-chain handles (e.g email, discord,
      etc) and allowing the user to redeem into any wallet.
      </div>
    </Stack>
  );

  const create= (
    <Stack spacing={1}>
      <Link to={`/gumdrop/create`}>
        CREATION
      </Link>

      <div>
      Creation builds a whitelist of users that can claim either existing
      fungible tokens or directly mint from a pre-sale candy-machine.
      </div>

      <div>
      Creators must choose a mint or a candy-machine config and UUID, an
      off-chain notification method (based on the handles supplied below, e.g
      email, discord, etc), and supply a list of recipients and balances with
      the following JSON schema{WHITESPACE}
      <HyperLink
        href={`data:text/plain;charset=utf-8,${JSON.stringify(require("./example.json"))}`}
        download="example.json"
        underline="none"
      >
      (Click here for an example)
      </HyperLink>
      </div>

      <pre style={{ fontSize: 14 }}>{`
[
  {
    "handle": "<DISTRIBUTION-SPECIFIC-HANDLE>"
    "amount": <#-TOKENS-OR-CANDY-MINTS>
  },
  ...
]`}</pre>

      <div>
      NB: When a candy-machine is supplied, update authority for the
      candy-machine will be transferred to the Gumdrop state. This can
      be reclaimed by closing the Gumdrop.
      </div>
    </Stack>
  );

  const claim = (
    <Stack spacing={1}>
      <Link to={`/gumdrop/claim`}>
        CLAIMS
      </Link>

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
      <Link to={`/gumdrop/close`}>
        CLOSING
      </Link>

      <div>
      Closing the Gumdrop cleans up the on-chain state and allows
      creators to recycle any lamports held for rent-exemption after the
      airdrop is complete.
      </div>

      <div>
      When closing a candy-machine-integrated distributor, update authority
      will be transferred back to the wallet owner.
      </div>
    </Stack>
  );

  const steps = [
    { name: "summary" , inner: summary } ,
    { name: "create"  , inner: create  } ,
    { name: "claim"   , inner: claim   } ,
    { name: "close"   , inner: close   } ,
  ];
  return (
    <Stack
      alignContent="left"
      textAlign="left"
      spacing={2}
    >
      {steps.map((s, idx) => <div key={idx}>{s.inner}</div>)}
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
    getWindowDimensions()
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
};

function App() {
  const colorModeCtx = useColorMode();

  React.useEffect(() => {}, [colorModeCtx.mode]);

  const theme = React.useMemo(
    () => {
      let mode;
      if (colorModeCtx.mode === "dark" || !colorModeCtx.mode) {
        mode = "dark";
      } else {
        mode = "light";
      }

      return createTheme({
        palette: {
          mode,
        },
      })
    },
    [colorModeCtx.mode]
  );

  const { width } = useWindowDimensions();

  return (
    <div className="App" style={{ backgroundColor: "transparent" }}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <CssBaseline />
          <Header narrow={width < 670}/>
          <Box
            maxWidth="60ch"
            width="calc(100% - 60px)"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Box height="40px" />
            <Switch>
              <Route path="/gumdrop/create" component={Create} />
              <Route path="/gumdrop/claim" component={Claim} />
              <Route path="/gumdrop/close" component={Close} />
              <Route path="/gumdrop/" component={About} />
            </Switch>
            <Box height="80px" />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
