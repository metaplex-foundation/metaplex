import { useTheme } from "@mui/material";
import React, { useContext } from "react";

export const ColorModeContext = React.createContext({});

export const ColorModeContextProvider = ({ children = undefined } : { children : React.ReactNode }) => {
  const [mode, setMode] = React.useState<'light' | 'dark'>('dark'); 
  const theme = useTheme();
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }
  return (
    <ColorModeContext.Provider
      value={{
        toggleColorMode,
        mode,
        theme,
      }}
    >
      {children}
    </ColorModeContext.Provider>
  );
};

export const useColorMode = (): any => {
  const context = useContext(ColorModeContext);
  return context;
};
