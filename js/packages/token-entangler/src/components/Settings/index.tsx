import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ENDPOINTS, useColorMode, useConnectionConfig } from "../../contexts";
import { notify, shortenAddress } from "@oyster/common";
import { CopyOutlined } from "@ant-design/icons";
import { ModalEnum, useModal, useWalletModal } from "../../contexts";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  FormControl,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

export const Settings = ({ narrow } : { narrow : boolean }) => {
  const { disconnect, publicKey } = useWallet();
  const { setEndpoint, env, endpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = React.useCallback(() => setVisible(true), [setVisible]);
  const { setModal } = useModal();
  const theme = useTheme();
  const colorModeCtx = useColorMode();

  const handleConnect = React.useCallback(() => {
    setModal(ModalEnum.WALLET);
    setVisible(true);
  }, [setModal, setVisible]);

  const connectedActions = [
    {
      click: async () => {
        if (publicKey) {
          await navigator.clipboard.writeText(publicKey.toBase58());
          notify({
            message: "Wallet update",
            description: "Address copied to clipboard",
          });
        }
      },
      innerNarrow: () => (
        `Copy Address (${publicKey && shortenAddress(publicKey.toBase58())})`
      ),
      inner: function ConnectedWalletCopyC() {
        return (
          <React.Fragment>
            <CopyOutlined />
            {publicKey && shortenAddress(publicKey.toBase58())}
          </React.Fragment>
        );
      },
    },
    {
      click: open,
      inner: () => "Change\u00A0Wallet",
    },
    {
      click: () => disconnect().catch(),
      inner: () => `Disconnect\u00A0(${env})`,
      expandedExtra: { // these are interepreted as props. TODO: specific types
        color: "error" as any,
        variant: "contained" as any,
      }
    },
  ];

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [envCollapseOpen, setEnvCollapseOpen] = React.useState(false);

  const hackySkipSet = "hackySkipSet";
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    if (event.target.classList.contains(hackySkipSet)) {
      return;
    }

    setDrawerOpen(open);
  };

  const drawerC = (inner) => {
    return (
      <React.Fragment>
        <Button onClick={toggleDrawer(true)}>
          <AccountBalanceWalletIcon />
        </Button>
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
        >
          <Box
            sx={{ width: 250 }}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
          >
            {inner}
          </Box>
        </Drawer>
      </React.Fragment>
    );
  };

  const themeSwitch = (
    <Button
      sx={{ ml: 1 }}
      onClick={colorModeCtx.toggleColorMode}
      color="inherit"
    >
      {theme.palette.mode === "dark" ? (
        <Brightness7Icon />
      ) : (
        <Brightness4Icon />
      )}
    </Button>
  );

  if (narrow) {
    const listHead = (
      <ListItem>
        <ListItemText
          primary="Wallet"
          primaryTypographyProps={{
            fontSize: "1.2rem",
            fontWeight: 'medium',
            letterSpacing: 0,
          }}
        />
      </ListItem>
    );
    return (
      <React.Fragment>
        {!publicKey && drawerC(
          <List>
            {listHead}
            <Divider />
            <ListItemButton
              onClick={() => setEnvCollapseOpen(!envCollapseOpen)}
              className={hackySkipSet}
            >
              Change Network
              {envCollapseOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={envCollapseOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {ENDPOINTS.map(p => (
                  <ListItemButton
                    selected={endpoint === p.endpoint}
                    onClick={() => setEndpoint(p.endpoint)}
                    key={p.name}
                    sx={{ pl: 4 }}
                    className={hackySkipSet}
                  >
                    {p.name}
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
            <ListItemButton onClick={handleConnect}>
              Connect
            </ListItemButton>
          </List>
        )}
        {publicKey && drawerC(
          <List>
            {listHead}
            <Divider />
            {connectedActions.map((a, idx) => {
              return (
                <ListItemButton onClick={a.click} key={idx}>
                  {(a.innerNarrow && a.innerNarrow()) || a.inner()}
                </ListItemButton>
              );
            })}
          </List>
        )}
        {themeSwitch}
      </React.Fragment>
    );
  } else {
    return (
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginRight: "36px",
        }}
      >
        {!publicKey && (
          <React.Fragment>
            <FormControl variant="standard" style={{minWidth: "10ch"}}>
              <Select
                id="connected-env-select"
                onChange={(e) => { setEndpoint(e.target.value); }}
                value={endpoint}
              >
                {ENDPOINTS.map(({ name, endpoint }) => (
                  <MenuItem key={name} value={endpoint}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Link underline="none">
              <Button
                variant="contained"
                onClick={handleConnect}
              >
                Connect
              </Button>
            </Link>
          </React.Fragment>
        )}
        {publicKey && connectedActions.map((a, idx) => {
            return (
              <Button
                key={idx}
                variant="outlined"
                onClick={a.click}
                {...a.expandedExtra}
              >
                {a.inner()}
              </Button>
            );
          })
        }
        {themeSwitch}
      </Stack>
    );
  }
};
