import React from "react";
import ReactDOM from "react-dom";

import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Link as HyperLink,
  InputLabel,
  MenuItem,
  Stack,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import FilePresentIcon from '@mui/icons-material/FilePresent';

import {
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintInfo,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sha256 } from "js-sha256";
import BN from 'bn.js';
import * as bs58 from "bs58";

// claim distribution
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

import {
  useConnection,
  Connection,
} from "../contexts";
import {
  CANDY_MACHINE_ID,
  MERKLE_DISTRIBUTOR_ID,
  MERKLE_TEMPORAL_SIGNER,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getCandyConfig,
  getCandyMachine,
  getCandyMachineAddress,
  getEdition,
  notify,
  shortenAddress,
} from "../utils";
import { MerkleTree } from "../utils/merkleTree";
import { DragAndDrop } from "./DragAndDrop";
import { DefaultModal } from "./DefaultModal";

// NB: assumes no overflow
const randomBytes = () : Uint8Array => {
  // TODO: some predictable seed? sha256?
  const buf = new Uint8Array(4);
  window.crypto.getRandomValues(buf);
  return buf;
}

const WHITESPACE = "\u00A0";

export type ClaimantInfo = {
  handle : string,
  amount : number,
  edition : number,

  pin    : BN,
  url    : string,

  seed   : PublicKey,
  secret : PublicKey,
};

export type AuthKeys = { [key: string] : string }

type DropInfo = {
  type : string,
  meta : string,
};

const formatDropMessage = (info : ClaimantInfo, drop : DropInfo) => {
  if (drop.type === "Token") {
    return {
      subject: "Gumdrop Token Drop",
      message: `You received ${info.amount} token(s) `
             + `(click <a href="${drop.meta}">here</a> to view the mint on explorer). `
             + `<a href="${info.url}">Click here to claim them!</a>`,
    };
  } else {
    return {
      subject: "Gumdrop NFT Drop",
      message: `You received ${info.amount} Candy Machine pre-sale mint `
             + `(click <a href="${drop.meta}">here</a> to view the config on explorer). `
             + `<a href="${info.url}">Click here to claim it!</a>`,
    };
  }
};

const setupSes = (auth : AuthKeys, source : string) => {
  console.log(`SES auth ${auth}`);
  const client = new SESClient({
    region: "us-east-2",
    credentials: {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
    },
  });

  return async (
    info : ClaimantInfo,
    drop : DropInfo,
  ) => {
    const formatted = formatDropMessage(info, drop);
    const message = {
      Destination: {
        ToAddresses: [
          info.handle,
        ]
      },
      Message: {
        Subject: {
          Data: formatted.subject,
          Charset: "utf-8",
        },
        Body: {
          Html: {
            Data: formatted.message,
            Charset: "utf-8",
          },
        },
      },
      Source: source,
    };
    console.log(message);

    try {
      const response = await client.send(new SendEmailCommand(message));
      console.log(response);
      if (response.$metadata.httpStatusCode !== 200) {
      //   throw new Error(`AWS SES ssemed to fail to send email: ${response[0].reject_reason}`);
      }
    } catch (err) {
      console.error(err);
    }
  };
}

const setupManual = (auth : AuthKeys, source : string) => {
  return async (
    info : ClaimantInfo,
    mintUrl: string,
  ) => {
    // TODO duplicated work since claim URLs are available for download
    // regardless...
    console.log({
      "handle": info.handle,
      "url": info.url,
    });
  };
}

const setupWalletListUpload = (auth : AuthKeys, source : string) => {
  const toUpload = Array<{ [key: string] : string }>();
  return async (
    info : ClaimantInfo,
    mintUrl: string,
  ) => {
    toUpload.push({
      "handle": info.handle,
      "url": info.url,
    });
  };
}

const setupSender = (
  method : string,
  auth : AuthKeys,
  source : string,
) => {
  if (method === "AWS SES") {
    return setupSes(auth, source);
  } else if (method === "Manual") {
    return setupManual(auth, source);
  } else if (method === "Wallets") {
    return setupWalletListUpload(auth, source);
  } else {
    throw new Error(`Unrecognized claim distribution method ${method}`);
  }
}

type Claimants = Array<ClaimantInfo>;
const parseClaimants = (
  input : string
) : Claimants => {
  const json = JSON.parse(input);
  return json.map(obj => {
    return {
      handle : obj.handle,
      amount : obj.amount,
      edition: obj.edition,
      url    : obj.url,
    };
  });
};

const reactModal = (renderModal) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const displayModal = ({ onSubmit, onDismiss }) => {
    ReactDOM.render(renderModal({ onSubmit, onDismiss, show: true }), container);
  };

  const hideModal = ({ onSubmit, onDismiss }, callback) => {
    ReactDOM.render(renderModal({ onSubmit, onDismiss, show: false }), container, callback);
  };

  const destroyModal = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };

  const confirmation = new Promise((resolve) => {
    const onSubmit = (value) => resolve(value);
    const onDismiss = () => resolve(undefined);
    displayModal({ onSubmit, onDismiss });
  });

  return confirmation.finally(() => {
    const onSubmit = () => {};
    const onDismiss = () => {};
    hideModal({ onSubmit, onDismiss }, destroyModal);
  });
};

const resendOnlyRender = ({ show, onSubmit, onDismiss }) => {
  const options = [
    { click: () => onSubmit("create"), name: "Create and Send" },
    { click: () => onSubmit("send")  , name: "Send only"       },
  ];
  return (
    <DefaultModal visible={show} onCancel={onDismiss} width="70ch">
      <p style={{
        color: "white",
        fontSize: "1rem",
        width: "50ch",
        marginTop: 8,
      }}>
        Uploaded distribution list has URLs for all claimants.
        Skip creation of airdrop and only re-send links?
      </p>
      <br />
      <Stack direction="row" spacing={2}>
      {options.map((opt) => {
        return (
          <Button
            key={opt.name}
            style={{
              width: "30ch",
              color: "white",
              marginBottom: 8,
            }}
            variant="outlined"
            onClick={opt.click}
          >
            {opt.name}
          </Button>
        );
      })}
      </Stack>
    </DefaultModal>
  );
};

const displayMintTokens = (amount : number, mintInfo : MintInfo) : string => {
  // TODO: better decimal rounding
  return String(amount / Math.pow(10, mintInfo.decimals));
};

const hyperLinkData = (data) => {
  const encoded = encodeURIComponent(JSON.stringify(data));
  return `data:text/plain;charset=utf-8,${encoded}`;
};

const shouldSendRender = (claimants, needsPin, claimMethod, claimInfo, baseKey) => {
  return ({ show, onSubmit, onDismiss }) => {
    return (
      <DefaultModal visible={show} onCancel={onDismiss} width="70ch">
        <h2
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 20,
          }}
        >
          Claim Distribution Preview
        </h2>
        <p style={{ color: "white", fontSize: 14, textAlign: "center" }}>
          Approving will save the keypair authority generated for gumdrop
          state. This keypair is necessary to close the gumdrop later!
        </p>
        <TableContainer
          sx={{
            "td, th": { color: "white" },
            backgroundColor: "#444444",
            borderRadius: "5px",
            maxHeight: "30ch",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Handle</TableCell>
                <TableCell>
                  {claimMethod === "edition"
                    ? "Edition"
                    : "Tokens"
                  }
                </TableCell>
                {needsPin && <TableCell>Pin</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {claimants.map((c) => (
                <TableRow
                  key={c.secret.toBase58()}
                  sx={{ 'td, th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">{c.handle} </TableCell>
                  <TableCell>
                    { claimMethod === "transfer" ? displayMintTokens(c.amount, claimInfo.mint.info)
                    : claimMethod === "candy"    ? c.amount
                    : /* === "edition" */          c.edition
                    }
                  </TableCell>
                  {needsPin && <TableCell>{c.pin.toNumber()}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box style={{ height: "3ch" }} />
        <Stack direction="row" spacing={2}>
          <Button
            style={{
              width: "30ch",
              color: "white",
              marginBottom: 8,
            }}
            variant="outlined"
            onClick={() => onSubmit(false)}
          >
            Cancel
          </Button>
          <HyperLink
            href={hyperLinkData(Array.from(baseKey.secretKey))}
            download={`${baseKey.publicKey.toBase58()}.json`}
            underline="none"
            style={{width: "30ch"}}
          >
            <Button
              style={{
                width: "100%",
                color: "white",
                marginBottom: 8,
              }}
              variant="outlined"
              onClick={() => onSubmit(true)}
            >
              Approve
            </Button>
          </HyperLink>
        </Stack>
      </DefaultModal>
    );
  }
};

const getMintInfo = async (
  connection : RPCConnection,
  mint : string
) : Promise<{ key: PublicKey, info: MintInfo }> => {
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
    const mintOwner = mintAccount.owner.toBase58();
    throw new Error(`Invalid mint owner ${mintOwner}`);
  }
  if (mintAccount.data.length !== MintLayout.span) {
    throw new Error(`Invalid mint size ${mintAccount.data.length}`);
  }
  const mintInfo = MintLayout.decode(Buffer.from(mintAccount.data));
  return {
    key: mintKey,
    info: mintInfo,
  };
};

const getCreatorTokenAccount = async (
  walletKey : PublicKey,
  connection : RPCConnection,
  mintKey : PublicKey,
  totalClaim : number,
) => {
  const [creatorTokenKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
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
  return creatorTokenKey;
}

export type CreateProps = {};

export const Create = (
  props : CreateProps,
) => {
  const connection = useConnection();
  const wallet = useWallet();

  // claim state
  const [claimMethod, setClaimMethod] = React.useState(localStorage.getItem("claimMethod") || "");
  const [candyConfig, setCandyConfig] = React.useState(localStorage.getItem("candyConfig") || "");
  const [candyUUID, setCandyUUID] = React.useState(localStorage.getItem("candyUUID") || "");
  const [mint, setMint] = React.useState(localStorage.getItem("mint") || "");
  const [masterMint, setMasterMint] = React.useState(localStorage.getItem("masterMint") || "");
  const [filename, setFilename] = React.useState("");
  const [text, setText] = React.useState("");
  const [claimURLs, setClaimURLs] = React.useState<Array<ClaimantInfo>>([]);

  // auth state
  const [otpAuth, setOtpAuth] = React.useState(localStorage.getItem("otpAuth") || "default");
  const [commMethod, setCommMethod] = React.useState(localStorage.getItem("commMethod") || "");
  const [commAuth, setCommAuth] = React.useState<AuthKeys>({});
  const [commSource, setCommSource] = React.useState(localStorage.getItem("commSource") || "");
  const [awsAccessKeyId, setAwsAccessKeyId] = React.useState("");
  const [awsSecretKey, setAwsSecretKey] = React.useState("");
  const [mailcAPIKey, setMailcAPIKey] = React.useState("");

  const explorerUrlFor = (key : PublicKey) => {
    return `https://explorer.solana.com/address/${key.toBase58()}?cluster=${Connection.envFor(connection)}`;
  }

  const submit = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    setClaimURLs([]);

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const claimants = parseClaimants(text);
    if (claimants.length === 0) {
      throw new Error(`No claimants provided`);
    }

    claimants.forEach((c, idx) => {
      if (!c.handle) throw new Error(`Claimant ${idx} doesn't have handle`);
      if (!c.amount) throw new Error(`Claimant ${idx} doesn't have amount`);
      if (c.amount === 0) throw new Error(`Claimant ${idx} amount is 0`);
    });

    const claimInfo : any = {};
    claimInfo.total = claimants.reduce((acc, c) => acc + c.amount, 0);
    if (claimMethod === "transfer") {
      claimInfo.mint = await getMintInfo(connection, mint);
      claimInfo.source = await getCreatorTokenAccount(
        wallet.publicKey,
        connection,
        claimInfo.mint.key,
        claimInfo.total
      );
      claimInfo.info = { type: "Token", meta: explorerUrlFor(claimInfo.mint.key) };
    } else if (claimMethod === "candy") {
      claimInfo.config = await getCandyConfig(connection, candyConfig);
      claimInfo.info = { type: "Candy", meta: explorerUrlFor(claimInfo.config) };

      const [candyMachineKey, ] = await getCandyMachineAddress(
        claimInfo.config, candyUUID);
      claimInfo.candyMachineKey = candyMachineKey;
      const candyMachine = await getCandyMachine(connection, candyMachineKey);
      console.log("Candy machine", candyMachine);

      const remaining = candyMachine.data.itemsAvailable.toNumber() - candyMachine.itemsRedeemed.toNumber();
      if (isNaN(remaining)) {
        // TODO: should this have an override?
        throw new Error(`Could not calculate how many candy machine items are remaining`);
      }
      if (remaining < claimInfo.total) {
        throw new Error(`Distributor is allocated more mints (${claimInfo.total}) `
                      + `than the candy machine has remaining (${remaining})`);
      }
      if (!candyMachine.authority.equals(wallet.publicKey)) {
        throw new Error(`Candy machine authority does not match wallet public key`);
      }
    } else if (claimMethod === "edition") {
      claimInfo.masterMint = await getMintInfo(connection, masterMint);
      claimInfo.creatorTokenKey = await getCreatorTokenAccount(
        wallet.publicKey,
        connection,
        claimInfo.masterMint.key,
        1 // just check that the creator has the master mint
      );
      claimInfo.info = { type: "Edition", meta: explorerUrlFor(claimInfo.masterMint.key) };

      const masterEditionKey = await getEdition(claimInfo.masterMint.key);
      const masterEdition = await connection.getAccountInfo(masterEditionKey);
      if (masterEdition === null) {
        throw new Error(`Could not fetch master edition`);
      }
      console.log("Master edition", masterEdition);

      // TODO: check that editions within claimants are actually not filled?
      // This is cursory check that the total number of editions specified is
      // not greater than the max supply
      //
      // maxSupply is an option, 9 bytes, first is 0 means is none
      const currentSupply = new BN(masterEdition.data.slice(1, 1+8), 8, "le").toNumber();
      let maxSupply;
      if (masterEdition.data[9] === 0) {
          maxSupply = null;
      } else {
          maxSupply = new BN(masterEdition.data.slice(10, 10+8), 8, "le").toNumber();
      }
      console.log("Max supply", maxSupply);
      console.log("Current supply", currentSupply);

      if (maxSupply !== null && maxSupply < claimInfo.total) {
        throw new Error(`Distributor is allocated more editions (${claimInfo.total}) `
                      + `than the master has total (${maxSupply})`);
      }

      const editions : { [key: number]: number } = {};
      claimants.forEach((c, idx) => {
        if (!c.edition) throw new Error(`Claimant ${idx} doesn't have edition`);
        if (c.edition > maxSupply) {
          throw new Error(`Claimant ${idx} assigned edition ${c.edition} which is greater than max supply`);
        }
        if (c.edition in editions) {
          throw new Error(`Claimant ${idx} and ${editions[c.edition]} are both assigned to edition ${c.edition}`);
        } else {
          editions[c.edition] = idx;
        }
      });

      if (currentSupply !== 0) {
        notify({
          message: `Warning: suspicious create`,
          description: `Master edition has existing supply ${currentSupply}`
        });
      }
    } else {
      throw new Error(`Unknown claim method ${claimMethod}`);
    }
    console.log("Claims info", claimInfo);


    const mightHaveExisting = (info : ClaimantInfo) => {
      // TODO: others?
      return info.url !== undefined && info.url !== null;
    };
    if (claimants.reduce((acc, c) => acc && mightHaveExisting(c), true)) {
      // TODO: more validation of URLs? The creator is using they're own
      // credentials to re-send so if they're malicious it's not that bad
      // right?...
      const resendOnly = await reactModal(resendOnlyRender);
      console.log("Resend only", resendOnly);
      if (resendOnly === "send") {
        setClaimURLs(claimants);
        const sender = setupSender(commMethod, commAuth, commSource);
        for (const c of claimants) {
          await sender(c, claimInfo.info);
        }
        return;
      } else if (resendOnly === "create") {
        // fallthrough to full create
      } else {
        // dismissed. don't use exceptions for control flow?
        throw new Error("Dismissed");
      }
    }

    claimants.forEach(c => {
      c.pin = new BN(randomBytes());
      c.seed = claimMethod === "transfer" ? claimInfo.mint.key
             : claimMethod === "candy"    ? claimInfo.config
             : /* === edition */            claimInfo.masterMint.key;
    });

    const leafs : Array<Buffer> = [];
    let needsPin = true;
    for (let idx = 0; idx < claimants.length; ++idx ) {
      const claimant = claimants[idx];
      if (commMethod === "Wallets") {
        needsPin = false;
        try {
          claimant.secret = new PublicKey(claimant.handle);
        } catch (err) {
          throw new Error(`Invalid claimant wallet handle ${err}`);
        }
      } else {
        const seeds = [
          claimant.seed.toBuffer(),
          Buffer.from(claimant.handle),
          Buffer.from(claimant.pin.toArray("le", 4)),
        ];
        const [claimantPda, ] = await PublicKey.findProgramAddress(
            seeds, MERKLE_DISTRIBUTOR_ID);
        claimant.secret = claimantPda;
      }
      // TODO: get this clarified with jordan... we can either just assign some
      // range of editions to a user or give them an amount and just keep a
      // counter on the distributor... the latter is much less work but we lose
      // the ability to use gumdrop for auction house winnings and such?
      const extra = claimMethod === "edition"
        ? [...new BN(claimant.edition).toArray("le", 8)]
        : []
      leafs.push(Buffer.from(
        [...new BN(idx).toArray("le", 8),
         ...claimant.secret.toBuffer(),
         ...claimant.seed.toBuffer(),
         ...new BN(claimant.amount).toArray("le", 8),
         ...extra
        ]
      ));
    }

    const tree = new MerkleTree(leafs);
    const root = tree.getRoot();


    const base = Keypair.generate();
    console.log(`Base ${base.publicKey.toBase58()}`);
    const [distributor, dbump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("MerkleDistributor"),
        base.publicKey.toBuffer(),
      ],
      MERKLE_DISTRIBUTOR_ID);

    for (let idx = 0; idx < claimants.length; ++idx) {
      const proof = tree.getProof(idx);
      const verified = tree.verifyProof(idx, proof, root);

      if (!verified) {
        throw new Error("Gumdrop merkle tree verification failed");
      }

      const claimant = claimants[idx];
      const params = [
        `distributor=${distributor}`,
        `handle=${claimant.handle}`,
        `amount=${claimant.amount}`,
        `index=${idx}`,
        `proof=${proof.map(b => bs58.encode(b))}`,
      ];
      if (needsPin) {
        params.push(`pin=${claimant.pin.toNumber()}`);
      }
      if (claimMethod === "transfer") {
        params.push(`tokenAcc=${claimInfo.source}`);
      } else if (claimMethod === "candy") {
        params.push(`config=${candyConfig}`);
        params.push(`uuid=${candyUUID}`);
      } else {
        params.push(`master=${claimInfo.masterMint.key}`);
        params.push(`edition=${claimant.edition}`);
      }
      const query = params.join("&");

      claimant.url = `${window.location.origin}${window.location.pathname}#/claim?${query}`;
    }

    const shouldSend = await reactModal(
      shouldSendRender(claimants, needsPin, claimMethod, claimInfo, base)
    ) as boolean | undefined;
    if (shouldSend === true) {
    } else {
      // dismissed. don't use exceptions for control flow?
      throw new Error("Claim distribution preview not approved");
    }

    setClaimURLs(claimants);

    // temporal auth is the AWS signer by 'default' and a no-op key otherwise
    let temporalSigner;
    if (commMethod === "Wallets") {
      // TODO: this is a bit jank. There should be no form option to set the
      // OTP auth if we are using a wallet but there's still a defaulted value
      // atm...
      // NB: We also need this to not be 'none' since there is a special check
      // for claimant_secret==accounts.temporal
      temporalSigner = MERKLE_DISTRIBUTOR_ID;
    } else if (otpAuth === "default") {
      temporalSigner = MERKLE_TEMPORAL_SIGNER;
    } else if (otpAuth === "none") {
      temporalSigner = PublicKey.default;
    } else {
      throw new Error(`Unknown OTP authorization type ${otpAuth}`);
    }

    console.log(`Temporal signer: ${temporalSigner.toBase58()}`);

    // initial merkle-distributor state
    const instructions = Array<TransactionInstruction>();
    instructions.push(new TransactionInstruction({
        programId: MERKLE_DISTRIBUTOR_ID,
        keys: [
            { pubkey: base.publicKey          , isSigner: true  , isWritable: false } ,
            { pubkey: distributor             , isSigner: false , isWritable: true  } ,
            { pubkey: wallet.publicKey        , isSigner: true  , isWritable: false } ,
            { pubkey: SystemProgram.programId , isSigner: false , isWritable: false } ,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:new_distributor")).slice(0, 8),
          ...new BN(dbump).toArray("le", 1),
          ...root,
          ...temporalSigner.toBuffer(),
        ])
    }));

    if (claimMethod === "transfer") {
      instructions.push(Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        claimInfo.source,
        distributor,
        wallet.publicKey,
        [],
        claimInfo.total
      ));
    } else if (claimMethod === "candy") {
      const [distributorWalletKey, ] = await PublicKey.findProgramAddress(
        [
          Buffer.from("Wallet"),
          distributor.toBuffer(),
        ],
        MERKLE_DISTRIBUTOR_ID
      );

      instructions.push(new TransactionInstruction({
          programId: CANDY_MACHINE_ID,
          keys: [
              { pubkey: claimInfo.candyMachineKey,isSigner: false , isWritable: true  } ,
              { pubkey: wallet.publicKey        , isSigner: true  , isWritable: false } ,
          ],
          data: Buffer.from([
            ...Buffer.from(sha256.digest("global:update_authority")).slice(0, 8),
            ...new BN(1).toArray("le", 1),  // optional exists...
            ...distributorWalletKey.toBuffer(),
          ])
      }));
    } else if (claimMethod === "edition") {
      // transfer master edition to distributor
      const [distributorTokenKey, ] = await PublicKey.findProgramAddress(
        [
          distributor.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          claimInfo.masterMint.key.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      );

      instructions.push(Token.createAssociatedTokenAccountInstruction(
          SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          claimInfo.masterMint.key,
          distributorTokenKey,
          distributor,
          wallet.publicKey
        ));

      instructions.push(Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          claimInfo.creatorTokenKey,
          distributorTokenKey,
          wallet.publicKey,
          [],
          1
        ));
    }

    const createResult = await Connection.sendTransactionWithRetry(
      connection,
      wallet,
      instructions,
      [base]
    );

    console.log(createResult);
    if (typeof createResult === "string") {
      throw new Error(createResult);
    } else {
      notify({
        message: "Distributor creation succeeded",
        description: (
          <HyperLink href={Connection.explorerLinkFor(createResult.txid, connection)}>
            View transaction on explorer
          </HyperLink>
        ),
      });
    }

    console.log("Distributing claim URLs");
    const sender = setupSender(commMethod, commAuth, commSource);
    for (const c of claimants) {
      await sender(c, claimInfo.info);
    }
  };

  const handleFiles = (files) => {
    if (files.length !== 1) {
      notify({
        message: "File upload failed",
        description: `Received ${files.length} files`,
      });
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e !== null && e.target !== null) {
        if (typeof e.target.result === "string") {
          try {
            parseClaimants(e.target.result);
          } catch {
            notify({
              message: `File upload failed for: ${file.name}`,
              description: (
                <span>
                  Could not parse uploaded file.{WHITESPACE}
                  <HyperLink href="#/">
                    Does it follow the JSON scheme?
                  </HyperLink>
                </span>
              ),
            });
            setFilename("");
            setText("");
            return;
          }
          setFilename(file.name);
          setText(e.target.result);
        } else {
          notify({
            message: `File upload failed for: ${file.name}`,
            description: "Could not read uploaded file",
          });
        }
      }
    };
    reader.readAsText(file);
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
            onChange={e => {
              setCandyConfig(e.target.value);
              localStorage.setItem("candyConfig", e.target.value);
            }}
          />
          <TextField
            style={{width: "60ch"}}
            id="config-uuid-text-field"
            label="Candy UUID"
            value={candyUUID}
            onChange={e => {
              setCandyUUID(e.target.value);
              localStorage.setItem("candyUUID", e.target.value);
            }}
          />
        </React.Fragment>
      );
    } else if (claimMethod === "transfer") {
      return (
        <TextField
          style={{width: "60ch"}}
          id="mint-text-field"
          label="Mint"
          value={mint}
          onChange={(e) => {
            localStorage.setItem("mint", e.target.value);
            setMint(e.target.value);
          }}
        />
      );
    } else if (claimMethod === "edition") {
      // transfers master mint token from this account to the distributor
      // wallet ATA
      return (
        <TextField
          style={{width: "60ch"}}
          id="master-mint-text-field"
          label="Master Mint"
          value={masterMint}
          onChange={(e) => {
            localStorage.setItem("masterMint", e.target.value);
            setMasterMint(e.target.value);
          }}
        />
      );
    }
  };

  const commAuthorization = (commMethod) => {
    if (commMethod === "Manual" || commMethod === "Wallets") {
      return null;
    }

    if (commMethod === "AWS SES") {
      return (
        <React.Fragment>
          <TextField
            style={{width: "60ch"}}
            id="comm-access-key-id-field"
            label={`${commMethod} Access Key Id`}
            value={awsAccessKeyId}
            onChange={(e) => {
              setCommAuth(prev => ({...prev, accessKeyId: e.target.value}));
              setAwsAccessKeyId(e.target.value)
            }}
          />
          <TextField
            style={{width: "60ch"}}
            id="comm-secret-access-key-field"
            label={`${commMethod} Secret Access Key`}
            value={awsSecretKey}
            onChange={(e) => {
              setCommAuth(prev => ({...prev, secretAccessKey: e.target.value}));
              setAwsSecretKey(e.target.value)
            }}
          />
          <TextField
            style={{width: "60ch"}}
            id="comm-source-field"
            label={`${commMethod} Source`}
            value={commSource}
            onChange={(e) => {
              localStorage.setItem("commSource", e.target.value);
              setCommSource(e.target.value)
            }}
          />
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
        <TextField
          style={{width: "60ch"}}
          id="comm-auth-field"
          label={`${commMethod} API key`}
          value={mailcAPIKey}
          onChange={(e) => {
            setCommAuth(prev => ({...prev, apiKey: e.target.value}));
            setMailcAPIKey(e.target.value)
          }}
        />
        <TextField
          style={{width: "60ch"}}
          id="comm-source-field"
          label={`${commMethod} Source`}
          value={commSource}
          onChange={(e) => {
            localStorage.setItem("commSource", e.target.value);
            setCommSource(e.target.value)
          }}
        />
      </React.Fragment>
    );
  };

  const fileUpload = (
    <React.Fragment>
      <DragAndDrop handleDrop={handleFiles} >
        <Stack
          direction="row"
          style={{
            width: "60ch",
            height: "15ch",
          }}
          sx={{
            border: '1px dashed grey',
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <Button
            variant="text"
            component="label"
            style={{
              padding: 0,
              // don't make the button click field too large...
              marginTop: "5ch",
              marginBottom: "5ch",
            }}
          >
            Upload a {filename === "" ? "distribution" : "different"} list
            <input
              type="file"
              onChange={(e) => {
                handleFiles(e.target.files);
                // re-parse every time...
                e.target.value = '';
              }}
              hidden
            />
          </Button>
          {WHITESPACE}
          {/*For display alignment...*/}
          <Button
            variant="text"
            component="label"
            disabled={true}
            style={{padding: 0}}
          >
            or drag it here
          </Button>
        </Stack>
      </DragAndDrop>
      {filename !== ""
      ? (<Button
            variant="text"
            component="label"
            disabled={true}
            style={{
              padding: 0,
              // textTransform: 'none',
            }}
          >
            <FilePresentIcon />
            <span>{WHITESPACE} Uploaded {filename}</span>
          </Button>
        )
      : (<Box/>)}
    </React.Fragment>
  );

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
  const createAirdrop = (
    <Box sx={{ position: "relative" }}>
    <Button
      disabled={!wallet.connected || !commMethod || !filename || loading}
      variant="contained"
      style={{ width: "100%" }}
      onClick={(e) => {
        setLoading(true);
        const wrap = async () => {
          try {
            await submit(e);
            setLoading(false);
          } catch (err) {
            notify({
              message: "Create failed",
              description: `${err}`,
            });
            setLoading(false);
          }
        };
        wrap();
      }}
    >
      Create{claimURLs.length > 0 ? " Another " : " "}Gumdrop
    </Button>
    {loading && loadingProgress()}
    </Box>
  );

  const otpAuthC = (
    <React.Fragment>
      <FormControl fullWidth>
        <InputLabel id="otp-auth-label">OTP Authorization</InputLabel>
        <Select
          labelId="otp-auth-label"
          id="otp-auth-select"
          value={otpAuth}
          label="OTP Authorization"
          onChange={(e) => {
            localStorage.setItem("otpAuth", e.target.value);
            setOtpAuth(e.target.value);
          }}
          style={{textAlign: "left"}}
        >
          <MenuItem value={"default"}>
            Default{WHITESPACE}
            <HyperLink
              href={explorerUrlFor(MERKLE_TEMPORAL_SIGNER)}
              underline="none"
              target="_blank" rel="noopener noreferrer"
            >
              ({shortenAddress(MERKLE_TEMPORAL_SIGNER.toBase58())})
            </HyperLink>
          </MenuItem>
          <MenuItem value={"none"}>None</MenuItem>
        </Select>
      </FormControl>
    </React.Fragment>
  );

  return (
    <Stack spacing={2}>
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
      <FormControl fullWidth>
        <InputLabel id="comm-method-label">Distribution Method</InputLabel>
        <Select
          labelId="comm-method-label"
          id="comm-method-select"
          value={commMethod}
          label="Distribution Method"
          onChange={(e) => {
            localStorage.setItem("commMethod", e.target.value);
            setCommMethod(e.target.value);
          }}
          style={{textAlign: "left"}}
        >
          <MenuItem value={"AWS SES"}>AWS SES</MenuItem>
          <MenuItem value={"Manual"}>Manual</MenuItem>
          <MenuItem value={"Wallets"}>Wallets</MenuItem>
        </Select>
      </FormControl>
      {commMethod !== "" && commAuthorization(commMethod)}
      {commMethod !== "" && commMethod !== "Wallets" && otpAuthC}
      {fileUpload}
      {createAirdrop}
      {claimURLs.length > 0 && (
        <HyperLink
          href={hyperLinkData(claimURLs)}
          download="claimURLs.json"
          underline="none"
          style={{width: "100%"}}
        >
          <Button
            variant="contained"
            style={{width: "100%"}}
          >
            Download claim URLs
          </Button>
        </HyperLink>
      )}
    </Stack>
  );
};
