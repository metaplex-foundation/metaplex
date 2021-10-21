import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Route,
  Switch,
} from "react-router-dom";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Button,
  TextField,
} from "@mui/material";

import {
  useWallet,
  WalletProvider as BaseWalletProvider,
} from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Coder,
} from "@project-serum/anchor"
import { keccak_256 } from "js-sha3";
import { sha256 } from "js-sha256";
import BN from 'bn.js';
import * as bs58 from "bs58";

import "./App.css";
import {
  useConnection,
  useColorMode,
  Connection as Conn,
} from "./contexts";
import { SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID } from "./utils";
import Header from "./components/Header/Header";
import { MerkleTree } from "./utils/merkle-tree";

type CreateProps = {};
type ClaimProps = {};
type HomeProps = {};

// type PhoneNumber = string;
// type TwitterHandle = string;
// type DiscordId = string;
// type Handle = PhoneNumber | TwitterHandle | DiscordId;

// NB: assumes no overflow
const randomBytes = () : Uint8Array => {
  // TODO: some predictable seed? sha256?
  const buf = new Uint8Array(4);
  window.crypto.getRandomValues(buf);
  return buf;
}

const MERKLE_DISTRIBUTOR_ID = new PublicKey("2BXKBuQPRVjV9e9qC2wAVJgFLWDH8MULRQ5W5ABmJj45");

const idl = require("./utils/merkle_distributor.json");
const coder = new Coder(idl);

const Create = (
  props : CreateProps,
) => {
  const connection = useConnection();
  const wallet = useWallet();
  const [mint, setMint] = React.useState(localStorage.getItem("mint") || "");
  const [text, setText] = React.useState(localStorage.getItem("text") || "");

  const submit = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    localStorage.setItem("mint", mint);
    localStorage.setItem("text", text);

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const claimants = JSON.parse(text);
    const totalClaim = claimants.reduce((acc, c) => acc + c.amount, 0);
    const pins = claimants.map((_, idx) => [idx]);
    // const pins = claimants.map(() => randomBytes());
    console.log(claimants, pins);

    if (claimants.length === 0) {
      throw new Error(`No claimants provided`);
    }

    let mintKey : PublicKey;
    try {
      mintKey = new PublicKey(mint);
    } catch (err) {
      throw new Error(`Invalid mint key ${err}`);
    }
    const mintAccount = await connection.getAccountInfo(mintKey);
    if (mintAccount === null) {
      throw new Error(`Could not fetch mint`);
    }
    if (!mintAccount.owner.equals(TOKEN_PROGRAM_ID)) {
      throw new Error(`Invalid mint owner ${mintAccount.owner.toBase58()}`);
    }
    if (mintAccount.data.length !== MintLayout.span) {
      throw new Error(`Invalid mint size ${mintAccount.data.length}`);
    }
    const mintInfo = MintLayout.decode(Buffer.from(mintAccount.data));


    const [creatorTokenKey, ] = await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );
    const creatorTokenAccount = await connection.getAccountInfo(creatorTokenKey);
    if (creatorTokenAccount === null) {
      throw new Error(`Could not fetch creator token account`);
    }
    if (creatorTokenAccount.data.length !== AccountLayout.span) {
      throw new Error(`Invalid token account size ${creatorTokenAccount.data.length}`);
    }
    const creatorTokenInfo = AccountLayout.decode(Buffer.from(creatorTokenAccount.data));
    if (new BN(creatorTokenInfo.amount, 8, "le").toNumber() < totalClaim) {
      throw new Error(`Creator token account does not have enough tokens`);
    }


    const leafs : Array<Buffer> = [];
    for (let idx = 0; idx < claimants.length; ++idx ) {
      const claimant = claimants[idx];
      const seeds = [
        mintKey.toBuffer(),
        Buffer.from(claimant.handle),
        Buffer.from(pins[idx]),
      ];
      const [claimantPda, bump] = await PublicKey.findProgramAddress(seeds, MERKLE_DISTRIBUTOR_ID);
      claimant.bump = bump;
      claimant.pda = claimantPda;
      leafs.push(Buffer.from(
        keccak_256.digest(
          [...new BN(idx).toArray("le", 8),
           ...claimantPda.toBuffer(),
           ...new BN(claimant.amount).toArray("le", 8),
          ]
        )
      ));
    }

    const tree = new MerkleTree(leafs);
    const root = tree.getRoot();
    console.log("Root", root);
    claimants.map((_, idx) => {
      const proof = tree.getProof(idx);
      const verified = tree.verifyProof(idx, proof, root);
      console.log("Idx", idx, proof.map(b => bs58.encode(b)), verified);
    });

    // TODO: make the base a PDA of mintkey or a new account?

    const base = new Keypair();
    const [distributor, dbump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("MerkleDistributor"),
        base.publicKey.toBuffer(),
      ],
      MERKLE_DISTRIBUTOR_ID);

    const [distributorTokenKey, ] = await PublicKey.findProgramAddress(
      [
        distributor.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );


    const createDistributorTokenAccount = new TransactionInstruction({
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        keys: [
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: true  } ,
            { pubkey: distributorTokenKey     , isSigner: false , isWritable: true  } ,
            { pubkey: distributor             , isSigner: false , isWritable: false } ,
            { pubkey: mintKey                 , isSigner: false , isWritable: false } ,
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
            { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
            { pubkey: SYSVAR_RENT_PUBKEY      , isSigner: false , isWritable: false } ,
        ],
        data: Buffer.from([])
    });

    // initial merkle-distributor state
    const initDistributor = new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_ID,
        keys: [
            { pubkey: base.publicKey          , isSigner: true  , isWritable: false } ,
            { pubkey: distributor             , isSigner: false , isWritable: true  } ,
            { pubkey: mintKey                 , isSigner: false , isWritable: false } ,
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: false } ,
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:new_distributor")).slice(0, 8),
          ...new BN(dbump).toArray("le", 1),
          ...root,
          ...new BN(totalClaim).toArray("le", 8),
          ...new BN(claimants.length).toArray("le", 8),
        ])
    })

    const transferToATA = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        creatorTokenKey,
        distributorTokenKey,
        wallet.publicKey,
        [],
        totalClaim
      );


    await Conn.sendTransactionWithRetry(
      connection,
      wallet,
      [
        createDistributorTokenAccount,
        initDistributor,
        transferToATA,
      ],
      [base]
    );
  };

  return (
    <Box>
      <TextField
        style={{width: "60ch"}}
        id="outlined-multiline-flexible"
        label="Mint"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
      />
      <TextField
        style={{width: "60ch"}}
        id="outlined-multiline-flexible"
        label="Handles"
        multiline
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        disabled={!wallet.connected}
        variant="contained"
        color="success"
        onClick={(e) => {
          const wrap = async () => {
            try {
              await submit(e);
            } catch (err) {
              alert(`Failed to create merkle drop: ${err}`);
            }
          };
          wrap();
        }}
        sx={{ marginRight: "4px" }}
      >
        Create Merkle Airdrop
      </Button>
    </Box>
  );
};

const Claim = (
  props : ClaimProps,
) => {
  return (
    <div>
      Claim Merkle Airdrop
    </div>
  );
};

const Home = (
  props : HomeProps,
) => {
  return (
    <div>
      Merkle Airdrop
    </div>
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

  const mode =
    colorModeCtx.mode === "dark" || !colorModeCtx.mode ? "dark" : "light";

  useEffect(() => {}, [colorModeCtx.mode]);

  const { height } = useWindowDimensions();

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
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
            flexGrow: 1,
            mt: `${Math.floor(0.2 * height)}px`,
            px: "50%",
            display: "flex",
            alignSelf: "center",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <BrowserRouter>
            <Switch>
              <Route path="/create">
                <Create />
              </Route>
              <Route path="/claim">
                <Claim />
              </Route>
              <Route path="/">
                <Home />
              </Route>
            </Switch>
          </BrowserRouter>
        </Box>
      </ThemeProvider>
    </div>
  );
}

export default App;
