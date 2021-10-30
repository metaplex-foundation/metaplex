import React from "react";
import { RouteComponentProps, } from "react-router-dom";
import queryString from 'query-string';

import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Link as HyperLink,
  InputLabel,
  MenuItem,
  Select,
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
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
  CANDY_MACHINE_ID,
  MERKLE_DISTRIBUTOR_ID,
  MERKLE_TEMPORAL_SIGNER,
  TOKEN_METADATA_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getCandyMachine,
  getCandyMachineAddress,
  notify,
} from "../utils";
import { MerkleTree } from "../utils/merkleTree";
import { coder } from "../utils/merkleDistributor";

const buildMintClaim = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  distributorKey : PublicKey,
  distributorInfo : any,
  tokenAcc : string,
  proof : Array<Buffer>,
  handle : string,
  amount : number,
  index : number,
  pin : Array<number>,
) : Promise<[Array<TransactionInstruction>, Array<Buffer>, Array<Keypair>]> => {
  let tokenAccKey: PublicKey;
  try {
    tokenAccKey = new PublicKey(tokenAcc);
  } catch (err) {
    throw new Error(`Invalid tokenAcc key ${err}`);
  }
  const distTokenAccount = await connection.getAccountInfo(tokenAccKey);
  if (distTokenAccount === null) {
    throw new Error(`Could not fetch distributor token account`);
  }

  const tokenAccountInfo = AccountLayout.decode(distTokenAccount.data);
  const mint = new PublicKey(tokenAccountInfo.mint);

  console.log(mint.toBase58());

  const pdaSeeds = [
    mint.toBuffer(),
    Buffer.from(handle),
    Buffer.from(pin),
  ];

  const [claimantPda, ] = await PublicKey.findProgramAddress(
    pdaSeeds,
    MERKLE_DISTRIBUTOR_ID
  );

  // TODO: since it's in the PDA do we need it to be in the leaf?
  const leaf = Buffer.from(
    [...new BN(index).toArray("le", 8),
     ...claimantPda.toBuffer(),
     ...mint.toBuffer(),
     ...new BN(amount).toArray("le", 8),
    ]
  );

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

  const [walletTokenKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );

  const setup : Array<TransactionInstruction> = [];

  if (await connection.getAccountInfo(walletTokenKey) === null) {
    setup.push(Token.createAssociatedTokenAccountInstruction(
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        walletTokenKey,
        walletKey,
        walletKey
      ));
  }

  const claimAirdrop = new TransactionInstruction({
      programId: MERKLE_DISTRIBUTOR_ID,
      keys: [
          { pubkey: distributorKey          , isSigner: false , isWritable: true  } ,
          { pubkey: claimStatus             , isSigner: false , isWritable: true  } ,
          { pubkey: tokenAccKey             , isSigner: false , isWritable: true  } ,
          { pubkey: walletTokenKey          , isSigner: false , isWritable: true  } ,
          { pubkey: MERKLE_TEMPORAL_SIGNER  , isSigner: true  , isWritable: false } ,
          { pubkey: walletKey               , isSigner: true  , isWritable: false } ,  // payer
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

  return [[...setup, claimAirdrop], pdaSeeds, []];
}

const getMetadata = async (
  mint: PublicKey,
): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getMasterEdition = async (
  mint: PublicKey,
): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};


const buildCandyClaim = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  distributorKey : PublicKey,
  distributorInfo : any,
  candyConfig : string,
  candyUUID : string,
  proof : Array<Buffer>,
  handle : string,
  amount : number,
  index : number,
  pin : Array<number>,
  nftsToMint : number,
) : Promise<[Array<TransactionInstruction>, Array<Buffer>, Array<Keypair>]> => {

  let configKey : PublicKey;
  try {
    configKey = new PublicKey(candyConfig);
  } catch (err) {
    throw new Error(`Invalid candy config key ${err}`);
  }

  const pdaSeeds = [
    configKey.toBuffer(),
    Buffer.from(handle),
    Buffer.from(pin),
  ];

  const [claimantPda, ] = await PublicKey.findProgramAddress(
    pdaSeeds,
    MERKLE_DISTRIBUTOR_ID
  );

  // TODO: since it's in the PDA do we need it to be in the leaf?
  const leaf = Buffer.from(
    [...new BN(index).toArray("le", 8),
     ...claimantPda.toBuffer(),
     ...configKey.toBuffer(),
     ...new BN(amount).toArray("le", 8),
    ]
  );

  const matches = MerkleTree.verifyClaim(
    leaf, proof, Buffer.from(distributorInfo.root)
  );

  if (!matches) {
    throw new Error("Merkle proof does not match");
  }

  const [claimCount, cbump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("ClaimCount"),
      Buffer.from(new BN(index).toArray("le", 8)),
      distributorKey.toBuffer(),
    ],
    MERKLE_DISTRIBUTOR_ID
  );

  const [distributorWalletKey, wbump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("Wallet"),
      distributorKey.toBuffer(),
    ],
    MERKLE_DISTRIBUTOR_ID
  );

  const setup : Array<TransactionInstruction> = [];

  // TODO: from IDL
  const CLAIM_COUNT_SIZE = 16;
  const claimCountAccount = await connection.getAccountInfo(claimCount);
  let nftsAlreadyMinted = 0;
  if (claimCountAccount === null) {
    setup.push(SystemProgram.createAccount({
      fromPubkey: walletKey,
      newAccountPubkey: claimCount,
      space: CLAIM_COUNT_SIZE,
      lamports:
        await connection.getMinimumBalanceForRentExemption(
          CLAIM_COUNT_SIZE,
        ),
      programId: MERKLE_DISTRIBUTOR_ID,
    }));
  } else {
    // TODO: subtract already minted?...
    const claimAccountInfo = coder.accounts.decode(
      "ClaimCount", claimCountAccount.data);
    nftsAlreadyMinted = claimAccountInfo.count;
  }

  const nftsAvailable = amount;
  if (nftsToMint > nftsAvailable - nftsAlreadyMinted) {
    throw new Error(`Cannot mint ${nftsToMint} NFTs. ${nftsAvailable} were originally allocated`
      + (nftsAlreadyMinted > 0 ? ` and ${nftsAlreadyMinted} were already minted` : ""));
  }


  const [candyMachineKey, ] = await getCandyMachineAddress(configKey, candyUUID);
  const candyMachine = await getCandyMachine(connection, candyMachineKey);
  console.log(candyMachine);

  const candyMachineMints : Array<Keypair> = [];

  for (let i = 0; i < nftsToMint; ++i) {
    const [instrs, mint] = await buildSingleCandyMint(
      connection,
      walletKey,
      distributorKey,
      distributorWalletKey,
      claimCount,
      configKey,
      candyMachineKey,
      candyMachine.wallet,
      Buffer.from([
        ...new BN(wbump).toArray("le", 1),
        ...new BN(cbump).toArray("le", 1),
        ...new BN(index).toArray("le", 8),
        ...new BN(amount).toArray("le", 8),
        ...claimantPda.toBuffer(),
        ...new BN(proof.length).toArray("le", 4),
        ...Buffer.concat(proof),
      ]),
    );
    candyMachineMints.push(mint);
    setup.push(...instrs);
  }

  return [setup, pdaSeeds, candyMachineMints];
}

const buildSingleCandyMint = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  distributorKey : PublicKey,
  distributorWalletKey : PublicKey,
  claimCount : PublicKey,
  configKey : PublicKey,
  candyMachineKey : PublicKey,
  candyMachineWallet : PublicKey,
  data : Buffer,
) : Promise<[Array<TransactionInstruction>, Keypair]> => {
  const candyMachineMint = Keypair.generate();
  const candyMachineMetadata = await getMetadata(candyMachineMint.publicKey);
  const candyMachineMaster = await getMasterEdition(candyMachineMint.publicKey);

  const [walletTokenKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      candyMachineMint.publicKey.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );

  const setup : Array<TransactionInstruction> = [];
  setup.push(SystemProgram.createAccount({
    fromPubkey: walletKey,
    newAccountPubkey: candyMachineMint.publicKey,
    space: MintLayout.span,
    lamports:
      await connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      ),
    programId: TOKEN_PROGRAM_ID,
  }));

  setup.push(Token.createInitMintInstruction(
    TOKEN_PROGRAM_ID,
    candyMachineMint.publicKey,
    0,
    walletKey,
    walletKey,
  ));

  setup.push(Token.createAssociatedTokenAccountInstruction(
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    candyMachineMint.publicKey,
    walletTokenKey,
    walletKey,
    walletKey
  ));

  setup.push(Token.createMintToInstruction(
    TOKEN_PROGRAM_ID,
    candyMachineMint.publicKey,
    walletTokenKey,
    walletKey,
    [],
    1,
  ));

  setup.push(new TransactionInstruction({
      programId: MERKLE_DISTRIBUTOR_ID,
      keys: [
          { pubkey: distributorKey            , isSigner: false , isWritable: true  } ,
          { pubkey: distributorWalletKey      , isSigner: false , isWritable: true  } ,
          { pubkey: claimCount                , isSigner: false , isWritable: true  } ,
          { pubkey: MERKLE_TEMPORAL_SIGNER    , isSigner: true  , isWritable: false } ,
          { pubkey: walletKey                 , isSigner: true  , isWritable: false } , // payer

          { pubkey: configKey                 , isSigner: false , isWritable: true  } ,
          { pubkey: candyMachineKey           , isSigner: false , isWritable: true  } ,
          { pubkey: candyMachineWallet        , isSigner: false , isWritable: true  } ,
          { pubkey: candyMachineMint.publicKey, isSigner: false , isWritable: true  } ,
          { pubkey: candyMachineMetadata      , isSigner: false , isWritable: true  } ,
          { pubkey: candyMachineMaster        , isSigner: false , isWritable: true  } ,

          { pubkey: SystemProgram.programId   , isSigner: false , isWritable: false } ,
          { pubkey: TOKEN_PROGRAM_ID          , isSigner: false , isWritable: false } ,
          { pubkey: TOKEN_METADATA_PROGRAM_ID , isSigner: false , isWritable: false } ,
          { pubkey: CANDY_MACHINE_ID          , isSigner: false , isWritable: false } ,
          { pubkey: SYSVAR_RENT_PUBKEY        , isSigner: false , isWritable: false } ,
          { pubkey: SYSVAR_CLOCK_PUBKEY       , isSigner: false , isWritable: false } ,
      ],
      data: Buffer.from([
        ...Buffer.from(sha256.digest("global:claim_candy")).slice(0, 8),
        ...data,
      ])
  }));

  return [setup, candyMachineMint];
}

export type ClaimProps = {};

export const Claim = (
  props : RouteComponentProps<ClaimProps>,
) => {
  const connection = useConnection();
  const wallet = useWallet();

  let params = queryString.parse(props.location.search);
  const [distributor, setDistributor] = React.useState(params.distributor as string || "");
  const [claimMethod, setClaimMethod] = React.useState(params.tokenAcc ? "transfer" : "candy");
  const [tokenAcc, setTokenAcc] = React.useState(params.tokenAcc as string || "");
  const [candyConfig, setCandyConfig] = React.useState(params.config as string || "");
  const [candyUUID, setCandyUUID] = React.useState(params.uuid as string || "");
  const [nftsToMintStr, setNftsToMint] = React.useState(params.amount as string || "");
  const [handle, setHandle] = React.useState(params.handle as string || "");
  const [amountStr, setAmount] = React.useState(params.amount as string || "");
  const [indexStr, setIndex] = React.useState(params.index as string || "");
  const [pinStr, setPin] = React.useState(params.pin as string || "");
  const [proofStr, setProof] = React.useState(params.proof as string || "");

  const allFieldsPopulated =
    distributor.length > 0
    && ( params.tokenAcc
       ? tokenAcc.length > 0
       : candyConfig.length > 0 && candyUUID.length > 0
       )
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
      accessKeyId: "AKIA4UZOKPKEBSISSXIX",
      secretAccessKey: "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",
    },
  });

  const skipAWSWorkflow = false;

  const sendOTP = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const index = Number(indexStr);
    const amount = Number(amountStr);
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

    console.log(distributorInfo.temporal.toBase58());

    const proof = proofStr === "" ? [] : proofStr.split(",").map(b => {
      const ret = Buffer.from(bs58.decode(b))
      if (ret.length !== 32)
        throw new Error(`Invalid proof hash length`);
      return ret;
    });

    let instructions, pdaSeeds, extraSigners;
    if (claimMethod === "candy") {
      const nftsToMint = Number(nftsToMintStr);
      if (isNaN(nftsToMint)) {
        throw new Error(`Could not parse NFTs to mint ${nftsToMint}`);
      }
      console.log("Building candy claim");
      [instructions, pdaSeeds, extraSigners] = await buildCandyClaim(
        connection, wallet.publicKey, distributorKey, distributorInfo,
        candyConfig, candyUUID,
        proof, handle, amount, index, pin, nftsToMint
      );
    } else if (claimMethod === "transfer") {
      [instructions, pdaSeeds, extraSigners] = await buildMintClaim(
        connection, wallet.publicKey, distributorKey, distributorInfo,
        tokenAcc,
        proof, handle, amount, index, pin
      );
    } else {
      throw new Error(`Unknown claim method ${claimMethod}`);
    }

    let transaction = new Transaction();
    instructions.forEach((instruction) => transaction.add(instruction));
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash("singleGossip")
    ).blockhash;

    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      MERKLE_TEMPORAL_SIGNER,
      ...extraSigners.map(s => s.publicKey)
    );

    if (extraSigners.length > 0) {
      transaction.partialSign(...extraSigners);
    }

    if (!skipAWSWorkflow) {
      const params = {
        FunctionName: "send-OTP",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({
          method: "send",
          transaction: bs58.encode(transaction.serializeMessage()),
          seeds: pdaSeeds,
        }))),
      };

      const res = await client.send(new InvokeCommand(params));
      console.log(res);

      if (res.StatusCode !== 200) {
        throw new Error(`Failed to send AWS OTP. ${JSON.stringify(res)}`);
      }

      if (res.Payload === undefined) {
        throw new Error("No response payload");
      }

      let resp;
      try {
        resp = JSON.parse(Buffer.from(res.Payload).toString());
      } catch {
        throw new Error(`Could not parse response ${res.Payload}`);
      }

      if (!resp.MessageId) {
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

    // TODO: distinguish between OTP failure and transaction-error. We can try
    // again on the former but not the latter
    const OTP = Number(OTPStr);
    if (isNaN(OTP) || OTPStr.length === 0) {
      throw new Error(`Could not parse OTP ${OTPStr}`);
    }

    if (!skipAWSWorkflow) {
      const params = {
        FunctionName: "send-OTP",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({
          method: "verify",
          otp: OTP,
          handle: handle,  // TODO?
        }))),
      };

      const res = await client.send(new InvokeCommand(params));
      console.log(res);

      if (res.StatusCode !== 200) {
        const blob = JSON.stringify(res);
        throw new Error(`Failed to verify AWS OTP. ${blob}`);
      }

      if (res.Payload === undefined) {
        throw new Error("No response payload");
      }

      let resp, sig;
      try {
        resp = JSON.parse(Buffer.from(res.Payload).toString());
      } catch {
        throw new Error(`Could not parse response ${res.Payload}`);
      }

      try {
        sig = bs58.decode(JSON.parse(resp.body));
      } catch {
        throw new Error(`Could not decode transaction signature ${resp.body}`);
      }

      transaction.addSignature(MERKLE_TEMPORAL_SIGNER, sig);
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
            disabled={!editable}
          />
          <TextField
            style={{width: "60ch"}}
            id="config-uuid-text-field"
            label="Candy UUID"
            value={candyUUID}
            onChange={e => setCandyUUID(e.target.value)}
            disabled={!editable}
          />
          <TextField
            style={{width: "60ch"}}
            id="nfts-to-mint-text-field"
            label="NFTs To Mint"
            value={nftsToMintStr}
            onChange={e => setNftsToMint(e.target.value)}
          />
        </React.Fragment>
      );
    } else if (claimMethod === "transfer") {
      return (
        <React.Fragment>
          <TextField
            style={{width: "60ch"}}
            id="token-acc-text-field"
            label="Source Token Account"
            value={tokenAcc}
            onChange={(e) => setTokenAcc(e.target.value)}
            disabled={!editable}
          />
        </React.Fragment>
      );
    }
  };

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
          disabled={!editable}
        >
          <MenuItem value={"transfer"}>Token Transfer</MenuItem>
          <MenuItem value={"candy"}>Candy Machine</MenuItem>
        </Select>
      </FormControl>
      {claimMethod !== "" && claimData(claimMethod)}
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
        id="handle-text-field"
        label="Handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
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

