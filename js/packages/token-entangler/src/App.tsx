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
  Stack,
} from "@mui/material";
import Typography from '@mui/material/Typography';

// import "./App.css";
import {
  useColorMode,
} from "./contexts";
import { Header } from "./components/Header/Header";
import { Show } from "./components/Show";
import { Create } from "./components/Create";
import { Swap } from "./components/Swap";
import { Search } from "./components/Search";
import { Wizard } from "./components/Wizard";


const About = () => {
  const summary = (
    <Stack spacing={1}>
      <div>
        <Typography variant="h4" color="text.primary" gutterBottom>Token Entangler</Typography>
      </div>


    </Stack>
  );

  const create = (
    <Stack spacing={1}>
      <Link to={`/entanglement/create`}>
        CREATION
      </Link>

      <div>
        Creation builds a new token entanglement between two mints: MintA and MintB. MintB will be removed from the wallet.
        MintA does not need to be in the wallet or owned.
      </div>

    </Stack>
  );

  const show = (
    <Stack spacing={1}>
      <Link to={`/entanglement/show`}>
        SHOW
      </Link>

      <div>
        Show the information about a token entanglement stored on chain.
      </div>
    </Stack>
  );

  const swap = (
    <Stack spacing={1}>
      <Link to={`/entanglement/swap`}>
        SWAP
      </Link>

      <div>
        Swap NFTs
      </div>

    </Stack>
  );

  const search = (
    <Stack spacing={1}>
      <Link to={`/entanglement/search`}>
        SEARCH
      </Link>

      <div>
        Search performs a search on the chain for token entanglements of a given mint and given entanglement authority.
      </div>

    </Stack>
  );

  const wizard = (
    <Stack spacing={1}>
      <Link to={`/entanglement/wizard`}>
        WIZARD
      </Link>

      <div>
        Searches for entanglements from a whitelisted authority of the NFTs owned by the connected wallet.
        To define the whitelisted authority, the user must define an environment variable named: REACT_APP_WHITELISTED_AUTHORITY!
      </div>

    </Stack>
  );

  const steps = [
    { name: "summary", inner: summary },
    { name: "create", inner: create },
    { name: "show", inner: show },
    { name: "swap", inner: swap },
    { name: "search", inner: search },
    { name: "wizard", inner: wizard },
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

  React.useEffect(() => { }, [colorModeCtx.mode]);

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
          <Header narrow={width < 670} />
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
              <Route path="/entanglement/create" component={Create} />
              <Route path="/entanglement/show" component={Show} />
              <Route path="/entanglement/swap" component={Swap} />
              <Route path="/entanglement/search" component={Search} />
              <Route path="/entanglement/wizard" component={Wizard} />
              <Route path="/entanglement/" component={About} />
            </Switch>
            <Box height="80px" />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
