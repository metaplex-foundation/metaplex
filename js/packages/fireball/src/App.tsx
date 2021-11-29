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
  // Link as HyperLink,
  Stack,
} from "@mui/material";

import "./App.css";
import {
  useColorMode,
} from "./contexts";
import { Header } from "./components/Header/Header";
import { Redeem } from "./components/Redeem";
import { BurnCrank } from "./components/BurnCrank";

const WHITESPACE = "\u00A0";

const About = () => {
  return (
    <Stack
      alignContent="left"
      textAlign="left"
      spacing={2}
    >
      <Stack spacing={1.5}>
        <div>
          The Fireball program allows various NFT mints to be grouped as
          ingredients in a recipe. Clients can add ingredients to an on-chain
          dish and then invoke the recipe to create a new NFT.
        </div>

        <div>
          Note that there is no way to go backwards from a final product to the
          raw ingredients. Once the new NFT has been created, all submitted
          ingredients become eligible for burning!
        </div>

        <div>
          Check out the{WHITESPACE}
          <Link to={`/fireball/redeem?recipe=HV3om5hpwce6HTew26U4ULSNXWmv3vgGbR23Fgcyd52U`}>
            city-swap recipe for Collectoooooors!
          </Link>

          <br />
          <br />

          <img
            // more magical centering invocations
            style={{
              display: 'block',
              margin: 'auto',
            }}
            src="https://pplpleasr.metaplex.com/media/thumbnails/Solana_thumb_nft001.png"
          />
        </div>

      </Stack>

      <br />

      <Stack spacing={1.5}>
        <div>
          ARCHITECTURE
        </div>

        <div>
          The current Fireball program assumes no structure about the ingredients
          or their metadata. As such, recipes are created directly from a list of
          ingredients that are each a list of specific mints. It is the recipe
          creator&apos;s responsibility to ensure that each mint matches
          it&apos;s supposed ingredient! For prints, the recipe creator should
          also transfer the corresponding master editions to the recipe.
        </div>

        <div>
          For each ingredient, a merkle tree is created on the list of possible
          mints and the root of the tree is stored with the recipe. The list of
          all ingredients and their mints is stored separately on e.g arweave
          and a URI pointing to that list is stored in the recipe account.
        </div>

        <div>
          When adding an ingredient, clients must submit the mint along with
          merkle-proof that the mint is that ingredient. The Fireball program
          will check that the proof matches and transfer the NFT from the
          client&apos;s token account to the dish. While the recipe has not
          been completed, clients can add and remove ingredients as they wish.
        </div>

        <div>
          After all the ingredients have been added, clients can complete the
          recipe and claim a new NFT. The dish will be marked completed and
          ingredients can (will) be burned.
        </div>
      </Stack>
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
            maxWidth="80ch"
            width="calc(100% - 60px)"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Box height="40px" />
            <Switch>
              <Route exact path="/fireball/redeem/" component={Redeem} />
              <Route exact path="/fireball/burn/" component={BurnCrank} />
              <Route exact path="/fireball/" component={About} />
            </Switch>
            <Box height="80px" />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
