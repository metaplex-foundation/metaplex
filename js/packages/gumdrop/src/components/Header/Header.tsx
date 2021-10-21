import React, { useCallback } from "react";
import { Box } from "@mui/system";

import ConnectButton from "../ConnectButton";
import { ModalEnum, useModal, useWalletModal } from "../../contexts";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppBar } from "@mui/material";

export const Header: React.FC = () => {
  const { setModal } = useModal();
  const { setVisible } = useWalletModal();
  const wallet = useWallet();
  const connected = wallet.connected;

  const handleChange = useCallback(() => setVisible(true), [setVisible]);

  const handleConnect = useCallback(() => {
    setModal(ModalEnum.WALLET);
    setVisible(true);
  }, [setModal, setVisible]);
  return (
    <AppBar color="transparent">
    <Box
      sx={{
        display: "flex",
        bgcolor: "action.disabledBackground",
      }}
      minWidth="100%"
    >
      <Box sx={{flexGrow: 1}}></Box>
      <Box
        sx={{
          display: "flex",
          height: "62px",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <ConnectButton
          isConnected={connected}
          sx={{ marginRight: "36px" }}
          onClickConnect={handleConnect}
          onClickChange={handleChange}
        />
      </Box>
    </Box>
</AppBar>
  );
};

export default Header;
