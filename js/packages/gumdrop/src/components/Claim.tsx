import React from "react";
import { RouteComponentProps, } from "react-router-dom";
import queryString from 'query-string';

import {
  Box,
  Button,
  CircularProgress,
  Link as HyperLink,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
} from "@mui/material";

import {
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { keccak_256 } from "js-sha3";
import { sha256 } from "js-sha256";
import BN from 'bn.js';
import * as bs58 from "bs58";

// temporal signing
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

import {
  useConnection,
  Connection,
} from "../contexts";
import {
  MERKLE_DISTRIBUTOR_ID,
  MERKLE_TEMPORAL_SIGNER,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  notify,
} from "../utils";
import { MerkleTree } from "../utils/merkleTree";
import { coder } from "../utils/merkleDistributor";

export type ClaimProps = {};

export const Claim = (
  props : RouteComponentProps<ClaimProps>,
) => {
  const connection = useConnection();
  const wallet = useWallet();

  let params = queryString.parse(props.location.search);
  const [distributor, setDistributor] = React.useState(params.distributor as string || "");
  const [handle, setHandle] = React.useState(params.handle as string || "");
  const [amountStr, setAmount] = React.useState(params.amount as string || "");
  const [indexStr, setIndex] = React.useState(params.index as string || "");
  const [pinStr, setPin] = React.useState(params.pin as string || "");
  const [proofStr, setProof] = React.useState(params.proof as string || "");

  const allFieldsPopulated =
    distributor.length > 0
    && handle.length > 0
    && amountStr.length > 0
    && indexStr.length > 0
    && pinStr.length > 0;
    // NB: proof can be empty!

  const [editable, setEditable] = React.useState(!allFieldsPopulated);

  // temporal verification
  const [transaction, setTransaction] = React.useState<Transaction | null>(null);
  const [OTPStr, setOTPStr] = React.useState("");

  const client = new LambdaClient({
    region: "us-east-2",
    credentials: {
      accessKeyId: "AKIAUX7VGBD25I3UONGI",
      secretAccessKey: "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",
    },
  });

  const skipAWSWorkflow = false;

  const sendOTP = async (e : React.SyntheticEvent) => {
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

    const pdaSeeds = [
      distributorInfo.mint.toBuffer(),
      Buffer.from(handle),
      Buffer.from(pin),
    ];

    const [claimantPda, ] = await PublicKey.findProgramAddress(
      pdaSeeds,
      MERKLE_DISTRIBUTOR_ID
    );

    const leaf = Buffer.from(keccak_256.digest(
      [...new BN(index).toArray("le", 8),
       ...claimantPda.toBuffer(),
       ...new BN(amount).toArray("le", 8),
      ]
    ));

    const matches = MerkleTree.verifyClaim(
      leaf, proof, Buffer.from(distributorInfo.root)
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
      setup.push(Token.createAssociatedTokenAccountInstruction(
          SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          distributorInfo.mint,
          walletTokenKey,
          wallet.publicKey,
          wallet.publicKey
        ));
    }

    const claimAirdrop = new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_ID,
        keys: [
            { pubkey: distributorKey          , isSigner: false , isWritable: true  } ,
            { pubkey: claimStatus             , isSigner: false , isWritable: true  } ,
            { pubkey: distributorTokenKey     , isSigner: false , isWritable: true  } ,
            { pubkey: walletTokenKey          , isSigner: false , isWritable: true  } ,
            { pubkey: MERKLE_TEMPORAL_SIGNER  , isSigner: true , isWritable: false } ,
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

    const instructions = [...setup, claimAirdrop];

    let transaction = new Transaction();
    instructions.forEach((instruction) => transaction.add(instruction));
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash("singleGossip")
    ).blockhash;

    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      MERKLE_TEMPORAL_SIGNER
    );

    if (!skipAWSWorkflow) {
      const params = {
        FunctionName: "send-OTP",
        LogType: "Tail",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({
          transaction: bs58.encode(transaction.serializeMessage()),
          seeds: pdaSeeds,
        }))),
      };

      const res = await client.send(new InvokeCommand(params));
      console.log(res);
      if (!res.Payload) throw new Error("F"); // TODO

      const resp = JSON.parse(Buffer.from(res.Payload).toString());
      if (resp.statusCode !== 200) {
        throw new Error(`Failed to send AWS OTP. ${JSON.stringify(resp)}`);
      }
    }

    notify({
      message: "OTP sent",
      description: `Please check ${handle} for a OTP`,
    });

    setTransaction(transaction);
  };

  const verifyOTP = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    if (!transaction) {
      throw new Error(`Transaction not available for OTP verification`);
    }

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const OTP = Number(OTPStr);
    if (isNaN(OTP) || OTPStr.length === 0) {
      throw new Error(`Could not parse OTP ${OTPStr}`);
    }

    if (!skipAWSWorkflow) {
      const params = {
        FunctionName: "verify-OTP",
        LogType: "Tail",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({
          otp: OTP,
          handle: handle,  // TODO?
        }))),
      };

      const res = await client.send(new InvokeCommand(params));
      console.log(res);
      if (!res.Payload) throw new Error("F"); // TODO

      const resp = JSON.parse(Buffer.from(res.Payload).toString());
      if (resp.statusCode !== 200) {
        throw new Error(`Failed to verify AWS OTP. ${JSON.stringify(resp)}`);
      }

      const sig = resp.body;
      console.log("Sig", JSON.parse(sig), bs58.decode(JSON.parse(sig)));
      transaction.addSignature(
        MERKLE_TEMPORAL_SIGNER,
        bs58.decode(JSON.parse(sig)));
    }

    const fullySigned = await wallet.signTransaction(transaction);

    const claimResult = await Connection.sendSignedTransaction({
      connection,
      signedTransaction: fullySigned,
    });

    console.log(claimResult);
    notify({
      message: "Claim succeeded",
      description: (
        <HyperLink href={Connection.explorerLinkFor(claimResult.txid, connection)}>
          View transaction on explorer
        </HyperLink>
      ),
    });
    setTransaction(null);
  };

  const [loading, setLoading] = React.useState(false);
  const loadingProgress = () => (
    <CircularProgress
      size={24}
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: '-12px',
        marginLeft: '-12px',
      }}
    />
  );

  const verifyOTPC = (onClick) => (
    <React.Fragment>
      <TextField
        style={{width: "60ch"}}
        id="otp-text-field"
        label="OTP"
        value={OTPStr}
        onChange={(e) => setOTPStr(e.target.value)}
      />
      <Box />

      <Box sx={{ position: "relative" }}>
      <Button
        disabled={!wallet.connected || !OTPStr || loading}
        variant="contained"
        color="success"
        style={{ width: "100%" }}
        onClick={(e) => {
          setLoading(true);
          const wrap = async () => {
            try {
              await verifyOTP(e);
              setLoading(false);
              onClick();
            } catch (err) {
              setTransaction(null);
              notify({
                message: "Claim failed",
                description: `${err}`,
              });
              setLoading(false);
            }
          };
          wrap();
        }}
      >
        Claim Airdrop
      </Button>
      {loading && loadingProgress()}
      </Box>
    </React.Fragment>
  );

  const populateClaimC = (onClick) => (
    <React.Fragment>
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
      <Button
        color="info"
        onClick={(e) => setEditable(!editable)}
      >
        {!editable ? "Edit Claim" : "Stop Editing"}
      </Button>
      <Box />

      <Box sx={{ position: "relative" }}>
      <Button
        disabled={!wallet.connected || !allFieldsPopulated || loading}
        variant="contained"
        style={{ width: "100%" }}
        onClick={(e) => {
          setLoading(true);
          const wrap = async () => {
            try {
              await sendOTP(e);
              setLoading(false);
              onClick();
            } catch (err) {
              notify({
                message: "Claim failed",
                description: `${err}`,
              });
              setLoading(false);
            }
          };
          wrap();
        }}
      >
        Next
      </Button>
      {loading && loadingProgress()}
      </Box>
    </React.Fragment>
  );

  const steps = [
    { name: "Populate Claim", inner: populateClaimC },
    { name: "Verify OTP"    , inner: verifyOTPC     },
  ];

  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  return (
    <Stack spacing={2}>
      <Stepper activeStep={activeStep}>
        {steps.map((s, index) => {
          return (
            <Step key={s.name}>
              <StepLabel>{s.name}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <Box />
      {activeStep === steps.length
        ? (
          <React.Fragment>
            <Box />
            <div style={{ fontSize: "1.2rem" }}>
              Airdrop claimed successfully!
            </div>
          </React.Fragment>
        )
        : (
          <React.Fragment>
            {steps[activeStep].inner(handleNext)}
            {activeStep > 0 && (
              <Button
                color="info"
                onClick={handleBack}
              >
                Back
              </Button>
            )}
          </React.Fragment>
        )
      }
    </Stack>
  );
};

