import React from "react";
import { RouteComponentProps, } from "react-router-dom";
import queryString from 'query-string';

import {
  Box,
  Button,
  Link as HyperLink,
  Stack,
  TextField,
} from "@mui/material";

import {
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Coder,
} from "@project-serum/anchor"
import { keccak_256 } from "js-sha3";
import { sha256 } from "js-sha256";
import BN from 'bn.js';
import * as bs58 from "bs58";

import {
  useConnection,
  Connection,
} from "../contexts";
import { SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, notify } from "../utils";
import { MerkleTree } from "../utils/merkle-tree";

const MERKLE_DISTRIBUTOR_ID = new PublicKey("2BXKBuQPRVjV9e9qC2wAVJgFLWDH8MULRQ5W5ABmJj45");

const idl = require("../utils/merkle_distributor.json");
const coder = new Coder(idl);

export type ClaimProps = {};

export const Claim = (
  props : RouteComponentProps<ClaimProps>,
) => {
  const connection = useConnection();
  const wallet = useWallet();
  const [editable, setEditable] = React.useState(false);

  let params = queryString.parse(props.location.search);
  const [distributor, setDistributor] = React.useState(params.distributor as string);
  const [handle, setHandle] = React.useState(params.handle as string);
  const [amountStr, setAmount] = React.useState(params.amount as string);
  const [indexStr, setIndex] = React.useState(params.index as string);
  const [pinStr, setPin] = React.useState(params.pin as string);
  const [proofStr, setProof] = React.useState(params.proof as string);

  const submit = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const amount = Number(amountStr);
    const index = Number(indexStr);
    const pin = pinStr.split(",").map(Number);

    if (isNaN(amount)) {
      throw new Error(`Could not parse amount ${amountStr}`);
    }
    if (isNaN(index)) {
      throw new Error(`Could not parse index ${indexStr}`);
    }

    let distributorKey : PublicKey;
    try {
      distributorKey = new PublicKey(distributor);
    } catch (err) {
      throw new Error(`Invalid distributor key ${err}`);
    }
    const distributorAccount = await connection.getAccountInfo(distributorKey);
    if (distributorAccount === null) {
      throw new Error(`Could not fetch distributor`);
    }

    const distributorInfo = coder.accounts.decode(
      "MerkleDistributor", distributorAccount.data);

    const proof = proofStr === "" ? [] : proofStr.split(",").map(b => {
      const ret = Buffer.from(bs58.decode(b))
      if (ret.length !== 32)
        throw new Error(`Invalid proof hash length`);
      return ret;
    });

    console.log("Proof", proof);

    console.log(distributorInfo.mint.toBase58(), handle, pin);

    const [claimantPda, ] = await PublicKey.findProgramAddress(
      [
        distributorInfo.mint.toBuffer(),
        Buffer.from(handle),
        Buffer.from(pin),
      ],
      MERKLE_DISTRIBUTOR_ID
    );

    const leaf = Buffer.from(keccak_256.digest(
      [...new BN(index).toArray("le", 8),
       ...claimantPda.toBuffer(),
       ...new BN(amount).toArray("le", 8),
      ]
    ));

    console.log(leaf, claimantPda.toBase58(), MerkleTree.nodeHash(leaf));

    const matches = MerkleTree.verifyClaim(
      Buffer.from(keccak_256.digest(
        [...new BN(index).toArray("le", 8),
         ...claimantPda.toBuffer(),
         ...new BN(amount).toArray("le", 8),
        ]
      )),
      proof,
      Buffer.from(distributorInfo.root)
    );

    if (!matches) {
      throw new Error("Merkle proof does not match");
    }

    const [claimStatus, cbump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("ClaimStatus"),
        Buffer.from(new BN(index).toArray("le", 8)),
        distributorKey.toBuffer(),
      ],
      MERKLE_DISTRIBUTOR_ID
    );

    const [distributorTokenKey, ] = await PublicKey.findProgramAddress(
      [
        distributorKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        distributorInfo.mint.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const [walletTokenKey, ] = await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        distributorInfo.mint.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const setup : Array<TransactionInstruction> = [];

    if (await connection.getAccountInfo(walletTokenKey) === null) {
      setup.push(new TransactionInstruction({
          programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          keys: [
              { pubkey: wallet.publicKey        , isSigner: true  , isWritable: true  } ,
              { pubkey: walletTokenKey          , isSigner: false , isWritable: true  } ,
              { pubkey: wallet.publicKey        , isSigner: false , isWritable: false } ,
              { pubkey: distributorInfo.mint    , isSigner: false , isWritable: false } ,
              { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
              { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
              { pubkey: SYSVAR_RENT_PUBKEY      , isSigner: false , isWritable: false } ,
          ],
          data: Buffer.from([])
      }));
    }

    const claimAirdrop = new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_ID,
        keys: [
            { pubkey: distributorKey          , isSigner: false , isWritable: true  } ,
            { pubkey: claimStatus             , isSigner: false , isWritable: true  } ,
            { pubkey: distributorTokenKey     , isSigner: false , isWritable: true  } ,
            { pubkey: walletTokenKey          , isSigner: false , isWritable: true  } ,
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: false } ,  // payer
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
            { pubkey: TOKEN_PROGRAM_ID        , isSigner: false , isWritable: false } ,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:claim")).slice(0, 8),
          ...new BN(cbump).toArray("le", 1),
          ...new BN(index).toArray("le", 8),
          ...new BN(amount).toArray("le", 8),
          ...claimantPda.toBuffer(),
          ...new BN(proof.length).toArray("le", 4),
          ...Buffer.concat(proof),
        ])
    })

    const claimResult = await Connection.sendTransactionWithRetry(
      connection,
      wallet,
      [
        ...setup,
        claimAirdrop
      ],
      []
    );

    console.log(claimResult);
    if (typeof claimResult === "string") {
      notify({
        message: "Claim failed",
        description: claimResult,
      });
    } else {
      notify({
        message: "Claim succeeded",
        description: (
          <HyperLink href={Connection.explorerLinkFor(claimResult.txid, connection)}>
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
        id="distributor-text-field"
        label="Distributor"
        value={distributor}
        onChange={(e) => setDistributor(e.target.value)}
        disabled={!editable}
      />
      <TextField
        style={{width: "60ch"}}
        id="handle-text-field"
        label="Handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        disabled={!editable}
      />
      <TextField
        style={{width: "60ch"}}
        id="amount-text-field"
        label="Amount"
        value={amountStr}
        onChange={(e) => setAmount(e.target.value)}
        disabled={!editable}
      />
      <TextField
        style={{width: "60ch"}}
        id="index-text-field"
        label="Index"
        value={indexStr}
        onChange={(e) => setIndex(e.target.value)}
        disabled={!editable}
      />
      <TextField
        style={{width: "60ch"}}
        id="pin-text-field"
        label="Pin"
        value={pinStr}
        onChange={(e) => setPin(e.target.value)}
        disabled={!editable}
      />
      <TextField
        style={{width: "60ch"}}
        id="proof-text-field"
        label="Proof"
        multiline
        value={proofStr}
        onChange={(e) => setProof(e.target.value)}
        disabled={!editable}
      />
      <Box />
      <div>
        <Button
          style={{width: "15ch"}}
          color="info"
          onClick={(e) => setEditable(!editable)}
        >
          {!editable ? "Edit Claim" : "Stop Editing"}
        </Button>
        <Button
          style={{width: "45ch"}}
          disabled={!wallet.connected}
          variant="contained"
          color="success"
          onClick={(e) => {
            const wrap = async () => {
              try {
                await submit(e);
              } catch (err) {
                notify({
                  message: "Claim failed",
                  description: `${err}`,
                });
              }
            };
            wrap();
          }}
        >
          Claim Merkle Airdrop
        </Button>
      </div>
    </Stack>
  );
};

