import React from "react";

import {
  Button,
  FormControl,
  InputLabel,
  Link as HyperLink,
  MenuItem,
  Stack,
  Select,
  TextField,
} from "@mui/material";

import {
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from 'bn.js';
import { sha256 } from "js-sha256";

import {
  useConnection,
  Connection,
} from "../contexts";
import {
  CANDY_MACHINE_ID,
  GUMDROP_DISTRIBUTOR_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getCandyConfig,
  getCandyMachineAddress,
  notify,
} from "../utils";

export const Close = () => {
  const connection = useConnection();
  const wallet = useWallet();

  const [baseKey, setBaseKey] = React.useState("");
  const [claimMethod, setClaimMethod] = React.useState(localStorage.getItem("claimMethod") || "transfer");
  const [candyConfig, setCandyConfig] = React.useState(localStorage.getItem("candyConfig") || "");
  const [candyUUID, setCandyUUID] = React.useState(localStorage.getItem("candyUUID") || "");
  const [masterMint, setMasterMint] = React.useState(localStorage.getItem("masterMint") || "");

  const submit = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const base = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(baseKey)));

    const [distributorKey, dbump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("MerkleDistributor"),
        base.publicKey.toBuffer(),
      ],
      GUMDROP_DISTRIBUTOR_ID);

    const [distributorWalletKey, wbump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("Wallet"),
        distributorKey.toBuffer(),
      ],
      GUMDROP_DISTRIBUTOR_ID
    );

    let extraKeys;
    if (claimMethod === "candy") {
      const configKey = await getCandyConfig(connection, candyConfig);
      const [candyMachineKey, ] = await getCandyMachineAddress(
        configKey, candyUUID);

     extraKeys = [
            { pubkey: candyMachineKey         , isSigner: false , isWritable: true  } ,
            { pubkey: CANDY_MACHINE_ID        , isSigner: false , isWritable: false } ,
      ];
    } else {
      extraKeys = [];
    }

    const instructions = Array<TransactionInstruction>();
    if (claimMethod === "edition") {
      let masterMintKey: PublicKey;
      try {
        masterMintKey = new PublicKey(masterMint);
      } catch (err) {
        throw new Error(`Invalid mint key ${err}`);
      }
      const [distributorTokenKey, ] = await PublicKey.findProgramAddress(
        [
          distributorKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          masterMintKey.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      );

      const [walletTokenKey, ] = await PublicKey.findProgramAddress(
        [
          wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          masterMintKey.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      );

      instructions.push(new TransactionInstruction({
          programId: GUMDROP_DISTRIBUTOR_ID,
          keys: [
              { pubkey: base.publicKey          , isSigner: true  , isWritable: false } ,
              { pubkey: distributorKey          , isSigner: false , isWritable: false } ,
              { pubkey: distributorTokenKey     , isSigner: false , isWritable: true  } ,
              { pubkey: walletTokenKey          , isSigner: false , isWritable: true  } ,
              { pubkey: wallet.publicKey        , isSigner: false , isWritable: true  } ,
              { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
              { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
          ],
          data: Buffer.from([
            ...Buffer.from(sha256.digest("global:close_distributor_token_account")).slice(0, 8),
            ...new BN(dbump).toArray("le", 1),
          ])
      }));
    }

    const closeDistributor = new TransactionInstruction({
        programId: GUMDROP_DISTRIBUTOR_ID,
        keys: [
            { pubkey: base.publicKey          , isSigner: true  , isWritable: false } ,
            { pubkey: distributorKey          , isSigner: false , isWritable: true  } ,
            { pubkey: distributorWalletKey    , isSigner: false , isWritable: true  } ,
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: true  } ,
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
            { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
            ...extraKeys,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:close_distributor")).slice(0, 8),
          ...new BN(dbump).toArray("le", 1),
          ...new BN(wbump).toArray("le", 1),
        ])
    })

    const closeResult = await Connection.sendTransactionWithRetry(
      connection,
      wallet,
      [
        ...instructions,
        closeDistributor
      ],
      [base]
    );

    console.log(closeResult);
    if (typeof closeResult === "string") {
      notify({
        message: "Close failed",
        description: closeResult,
      });
    } else {
      notify({
        message: "Close succeeded",
        description: (
          <HyperLink href={Connection.explorerLinkFor(closeResult.txid, connection)}>
            View transaction on explorer
          </HyperLink>
        ),
      });
    }
  };

  const claimData = (claimMethod) => {
    if (claimMethod === "candy") {
      return (
        <React.Fragment>
          <TextField
            style={{width: "60ch"}}
            id="config-text-field"
            label="Candy Config"
            value={candyConfig}
            onChange={e => setCandyConfig(e.target.value)}
          />
          <TextField
            style={{width: "60ch"}}
            id="config-uuid-text-field"
            label="Candy UUID"
            value={candyUUID}
            onChange={e => setCandyUUID(e.target.value)}
          />
        </React.Fragment>
      );
    } else if (claimMethod === "transfer") {
      return null;
    } else if (claimMethod === "edition") {
      return (
        <React.Fragment>
          <TextField
            style={{width: "60ch"}}
            id="master-mint-text-field"
            label="Master Mint"
            value={masterMint}
            onChange={(e) => setMasterMint(e.target.value)}
          />
        </React.Fragment>
      );
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        style={{width: "60ch"}}
        id="base-text-field"
        label="Base Private Key"
        value={baseKey}
        onChange={(e) => setBaseKey(e.target.value)}
      />
      <FormControl fullWidth>
        <InputLabel id="claim-method-label">Claim Method</InputLabel>
        <Select
          labelId="claim-method-label"
          id="claim-method-select"
          value={claimMethod}
          label="Claim Method"
          onChange={(e) => {
            localStorage.setItem("claimMethod", e.target.value);
            setClaimMethod(e.target.value);
          }}
          style={{textAlign: "left"}}
        >
          <MenuItem value={"transfer"}>Token Transfer</MenuItem>
          <MenuItem value={"candy"}>Candy Machine</MenuItem>
          <MenuItem value={"edition"}>Limited Edition</MenuItem>
        </Select>
      </FormControl>
      {claimMethod !== "" && claimData(claimMethod)}
      <Button
        disabled={!wallet.connected || !baseKey}
        variant="contained"
        onClick={(e) => {
          const wrap = async () => {
            try {
              await submit(e);
            } catch (err) {
              notify({
                message: "Close failed",
                description: `${err}`,
              });
            }
          };
          wrap();
        }}
      >
        Close Gumdrop
      </Button>
    </Stack>
  );
};
