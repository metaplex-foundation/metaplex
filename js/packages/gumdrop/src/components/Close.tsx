import React from "react";

import {
  Button,
  Link as HyperLink,
  Stack,
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
  MERKLE_DISTRIBUTOR_ID,
  notify,
} from "../utils";

export const Close = () => {
  const connection = useConnection();
  const wallet = useWallet();

  const [baseKey, setBaseKey] = React.useState("");

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
      MERKLE_DISTRIBUTOR_ID);

    const closeDistributor = new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_ID,
        keys: [
            { pubkey: base.publicKey          , isSigner: true  , isWritable: false } ,
            { pubkey: distributorKey          , isSigner: false , isWritable: true  } ,
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: true  } ,
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
            { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:close_distributor")).slice(0, 8),
          ...new BN(dbump).toArray("le", 1),
        ])
    })

    const closeResult = await Connection.sendTransactionWithRetry(
      connection,
      wallet,
      [
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

  return (
    <Stack spacing={2}>
      <TextField
        style={{width: "60ch"}}
        id="base-text-field"
        label="Base Private Key"
        value={baseKey}
        onChange={(e) => setBaseKey(e.target.value)}
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
              notify({
                message: "Close failed",
                description: `${err}`,
              });
            }
          };
          wrap();
        }}
      >
        Close Merkle Airdrop
      </Button>
    </Stack>
  );
};
