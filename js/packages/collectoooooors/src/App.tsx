import React from "react";
import {
  BrowserRouter,
  // Link,
  Route,
  Switch,
} from "react-router-dom";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  // Link as HyperLink,
  // Stack,
} from "@mui/material";

import "./App.css";
import {
  useColorMode,
} from "./contexts";
import { Header } from "./components/Header/Header";
import { Redeem } from "./components/Redeem";
import { BurnCrank } from "./components/BurnCrank";

const About = () => {
  return (
    <>
      About
    </>
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
              <Route exact path="/collectoooooors/redeem/" component={Redeem} />
              <Route exact path="/collectoooooors/burn/" component={BurnCrank} />
              <Route exact path="/collectoooooors/" component={About} />
            </Switch>
            <Box height="80px" />
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
