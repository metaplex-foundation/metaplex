import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ENDPOINTS, useColorMode, useConnectionConfig } from "../../contexts";
import { notify, shortenAddress } from "../../utils";
import { CopyOutlined } from "@ant-design/icons";
import { ModalEnum, useModal, useWalletModal } from "../../contexts";
import {
  Button,
  FormControl,
  Link,
  NativeSelect,
  Stack,
} from "@mui/material";
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
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: "flex",
          height: "62px",
          justifyContent: "flex-end",
          alignItems: "center",
          marginRight: "36px",
        }}
      >
        {!connected && (
          <>
            <FormControl style={{minWidth: "10ch"}}>
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
            <Link underline="none">
              <Button
                variant="contained"
                onClick={handleConnect}
              >
                Connect
              </Button>
            </Link>
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
            >
              Change{"\u00A0"}Wallet
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => disconnect().catch()}
            >
              Disconnect{"\u00A0"}({env})
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
      </Stack>
    </>
  );
};
