import React, { useEffect, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Button,
  TextField,
} from "@mui/material";
import { useColorMode } from "./contexts";

import "./App.css";
import Header from "./components/Header/Header";

import {
  BrowserRouter,
  Route,
  Switch,
} from "react-router-dom";
import {
  useWallet,
  WalletProvider as BaseWalletProvider,
} from "@solana/wallet-adapter-react";
import { keccak_256 } from "js-sha3";
import { MerkleTree } from "./utils/merkle-tree";

type CreateProps = {};
type ClaimProps = {};
type HomeProps = {};

// type PhoneNumber = string;
// type TwitterHandle = string;
// type DiscordId = string;
// type Handle = PhoneNumber | TwitterHandle | DiscordId;

// NB: assumes no overflow
const randomBytes = () : Uint8Array => {
  // TODO: some predictable seed? sha256?
  const buf = new Uint8Array(4);
  window.crypto.getRandomValues(buf);
  return buf;
}

const Create = (
  props : CreateProps,
) => {
  const wallet = useWallet();
  const [mint, setMint] = React.useState("");
  const [text, setText] = React.useState("");

  const submit = (e : React.SyntheticEvent) => {
    e.preventDefault();

    const handles = text.split("\n")
        .map(h => h.trim())
        .filter(h => h.length !== 0);
    const pins = handles.map((_, idx) => [idx]);
    // const pins = handles.map(() => randomBytes());
    console.log(handles, pins);

    if (handles.length === 0) {
      return;
    }

    const leafs : Array<Buffer> = [];
    for (let i = 0; i < handles.length; ++i) {
      leafs.push(Buffer.from(
        keccak_256.digest(
          [...Buffer.from(handles[i]),
           ...Buffer.from(pins[i])
          ]
        )
      ));
    }

    const tree = new MerkleTree(leafs);
    console.log(tree.getRoot());
  };

  return (
    <Box>
      <TextField
        style={{width: "60ch"}}
        id="outlined-multiline-flexible"
        label="Mint"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
      />
      <TextField
        style={{width: "60ch"}}
        id="outlined-multiline-flexible"
        label="Handles"
        multiline
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        disabled={!wallet.connected}
        variant="contained"
        color="success"
        onClick={submit}
        sx={{ marginRight: "4px" }}
      >
        Create Merkle Airdrop
      </Button>
    </Box>
  );
};

const Claim = (
  props : ClaimProps,
) => {
  return (
    <div>
      Claim Merkle Airdrop
    </div>
  );
};

const Home = (
  props : HomeProps,
) => {
  return (
    <div>
      Merkle Airdrop
    </div>
  );
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
};

const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );

  useEffect(() => {
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

  const mode =
    colorModeCtx.mode === "dark" || !colorModeCtx.mode ? "dark" : "light";

  useEffect(() => {}, [colorModeCtx.mode]);

  const { height } = useWindowDimensions();

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [colorModeCtx.mode]
  );

  return (
    <div className="App" style={{ backgroundColor: "transparent" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <Box
          sx={{
            width: 600,
            flexGrow: 1,
            mt: `${Math.floor(0.2 * height)}px`,
            px: "50%",
            display: "flex",
            alignSelf: "center",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <BrowserRouter>
            <Switch>
              <Route path="/create">
                <Create />
              </Route>
              <Route path="/claim">
                <Claim />
              </Route>
              <Route path="/">
                <Home />
              </Route>
            </Switch>
          </BrowserRouter>
        </Box>
      </ThemeProvider>
    </div>
  );
}

export default App;
