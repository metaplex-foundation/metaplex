import React from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Stack,
} from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';

import { Settings } from "../Settings";

export const Header = ({ narrow }) => {
  const navs = [
    {
      href: "#/",
      innerNarrow: "About",
      inner: <HomeIcon />,
    },
    {
      href: "#/create",
      inner: "Create",
    },
    {
      href: "#/claim",
      inner: "Claim",
    },
    {
      href: "#/close",
      inner: "Close",
    },
  ];

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    setDrawerOpen(open);
  };

  return (
    <Box
      sx={{
        height: "52px",
        display: "flex",
        bgcolor: "action.disabledBackground",
        overflow: "auto",
      }}
    >
      {narrow
        ? (
          <React.Fragment>
            <Button onClick={toggleDrawer(true)}>
              <MenuIcon />
            </Button>
            <Drawer
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              <Box
                sx={{ width: 250 }}
                role="presentation"
                onClick={toggleDrawer(false)}
                onKeyDown={toggleDrawer(false)}
              >
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Gumdrop"
                      primaryTypographyProps={{
                        fontSize: "1.2rem",
                        fontWeight: 'medium',
                        letterSpacing: 0,
                      }}
                    />
                  </ListItem>
                  <Divider />
                  {navs.map((nav, idx) => {
                    return (
                      <ListItemButton component="a" href={nav.href} key={idx}>
                        {nav.innerNarrow || nav.inner}
                      </ListItemButton >
                    );
                  })}
                </List>
              </Box>
            </Drawer>
          </React.Fragment>
        )
        : (
          <Stack
            direction="row"
            spacing={2}
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              marginLeft: "36px",
            }}
          >
            {navs.map((nav, idx) => {
              return (
                <Link href={nav.href} key={idx} underline="none">
                  <Button variant="outlined" style={{minWidth:0}}>
                    {nav.inner}
                  </Button>
                </Link>
              );
            })}
          </Stack>
        )
      }
      <Box sx={{flexGrow: 1, minWidth: "36px"}}></Box>
      <Settings narrow={narrow}/>
    </Box>
  );
};
