import React from "react";
import {
  Box,
  Button,
  Link,
  Stack,
} from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';

import { Settings } from "../Settings";

export const Header: React.FC = () => {
  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "action.disabledBackground",
        overflow: "auto",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: "flex",
          height: "62px",
          justifyContent: "flex-start",
          alignItems: "center",
          marginLeft: "36px",
        }}
      >
        <Link href="#/" underline="none">
          <Button variant="outlined">
            <HomeIcon />
          </Button>
        </Link>
        <Link href="#/create" underline="none">
          <Button variant="outlined">
            Create
          </Button>
        </Link>
        <Link href="#/claim" underline="none">
          <Button variant="outlined">
            Claim
          </Button>
        </Link>
        <Link href="#/close" underline="none">
          <Button variant="outlined">
            Close
          </Button>
        </Link>
      </Stack>
      <Box sx={{flexGrow: 1, minWidth: "36px"}}></Box>
      <Settings />
    </Box>
  );
};

export default Header;
