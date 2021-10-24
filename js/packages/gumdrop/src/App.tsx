import React, { useEffect, useState } from "react";
import {
  HashRouter,
  Link,
  Route,
  Switch,
} from "react-router-dom";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Button,
  Stack,
} from "@mui/material";

import "./App.css";
import {
  useColorMode,
} from "./contexts";
import Header from "./components/Header/Header";
import { Claim } from "./components/Claim";
import { Create } from "./components/Create";

type HomeProps = {};

const Home = (
  props : HomeProps,
) => {
  return (
    <Stack
      direction="row"
      spacing={2}
    >
      <Link to="/create">
        <Button
          style={{width: "30ch"}}
          variant="contained"
          color="info"
        >
          Create
        </Button>
      </Link>
      <Link to="/claim">
        <Button
          style={{width: "30ch"}}
          variant="contained"
          color="info"
        >
          claim
        </Button>
      </Link>
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

  useEffect(() => {}, [colorModeCtx.mode]);

  const { height } = useWindowDimensions();

  const theme = React.useMemo(
    () => {
      const mode =
        colorModeCtx.mode === "dark" || !colorModeCtx.mode ? "dark" : "light";

      return createTheme({
        palette: {
          mode,
        },
      })
    },
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
            height: "100%",
            flexGrow: 1,
            pt: `${Math.floor(0.2 * height)}px`,
            px: "50%",
            display: "flex",
            alignSelf: "center",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <HashRouter>
            <Switch>
              <Route path="/create" component={Create} />
              <Route path="/claim" component={Claim} />
              <Route path="/" component={Home} />
            </Switch>
          </HashRouter>
        </Box>
      </ThemeProvider>
    </div>
  );
}

export default App;
