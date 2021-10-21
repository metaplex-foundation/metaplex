import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ENDPOINTS, useColorMode, useConnectionConfig } from "../../contexts";
import { notify, shortenAddress } from "../../utils";
import { CopyOutlined } from "@ant-design/icons";
import { ModalEnum, useModal, useWalletModal } from "../../contexts";
import { Box } from "@mui/system";
import { Button, FormControl, NativeSelect } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { connected, disconnect, publicKey } = useWallet();
  const { setEndpoint, env, endpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);
  const { setModal } = useModal();
  const theme = useTheme();
  const colorModeCtx = useColorMode();

  const handleConnect = useCallback(() => {
    setModal(ModalEnum.WALLET);
    setVisible(true);
  }, [setModal, setVisible]);

  return (
    <>
      <Box sx={{ display: "flex", minWidth: "100%" }}>
        {!connected && (
          <>
            <FormControl>
              <NativeSelect
                style={{ marginBottom: 5 }}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                }}
                value={endpoint}
              >
                {ENDPOINTS.map(({ name, endpoint }) => (
                  <option key={name} value={endpoint}>{name}</option>
                ))}
              </NativeSelect>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleConnect}
              sx={{ marginLeft: "10px" }}
            >
              Connect
            </Button>
          </>
        )}
        {connected && (
          <>
            {publicKey && (
              <Button
                variant="outlined"
                onClick={async () => {
                  if (publicKey) {
                    await navigator.clipboard.writeText(publicKey.toBase58());
                    notify({
                      message: "Wallet update",
                      description: "Address copied to clipboard",
                    });
                  }
                }}
              >
                <CopyOutlined />
                {shortenAddress(publicKey.toBase58())}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={open}
              sx={{ marginLeft: "10px" }}
            >
              Change Wallet
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => disconnect().catch()}
              sx={{ marginLeft: "10px" }}
            >
              Disconnect ({env})
            </Button>
          </>
        )}
        <IconButton
          sx={{ ml: 1 }}
          onClick={colorModeCtx.toggleColorMode}
          color="inherit"
        >
          {theme.palette.mode === "dark" ? (
            <Brightness7Icon />
          ) : (
            <Brightness4Icon />
          )}
        </IconButton>
        {additionalSettings}
      </Box>
    </>
  );
};
