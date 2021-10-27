import React from "react";
import ReactDOM from "react-dom";

import {
  Box,
  Button,
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
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { keccak_256 } from "js-sha3";
import { sha256 } from "js-sha256";
import BN from 'bn.js';
import * as bs58 from "bs58";

// claim distribution
import Mailchimp from "@mailchimp/mailchimp_transactional"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

import {
  useConnection,
  Connection,
} from "../contexts";
import {
  MERKLE_DISTRIBUTOR_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
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
  pin    : Uint8Array,
  bump   : number,
  pda    : PublicKey,
  url    : string,
};

const setupMailchimp = (auth : string, source : string) => {
  const mailchimp = Mailchimp(auth);

  return async (
    info : ClaimantInfo,
    mintUrl: string,
  ) => {
    const message = {
      from_email: source,
      // TODO: add to web front-end
      subject: "Token Drop",
      text: `You received ${info.amount} token(s) `
          + `(click <a href="${mintUrl}">here</a> to view the mint on explorer). `
          + `<a href="${info.url}">Click here to claim them!</a>`,
      to: [
        {
          email: info.handle,
          type: "to"
        }
      ]
    };

    const response = await mailchimp.messages.send({ message });

    console.log(response);
    if (!response[0] || response[0].status !== "sent") {
      throw new Error(`Mailchimp failed to send email: ${response[0].reject_reason}`);
    }
  };
}

const setupSes = (authStr : string, source : string) => {
  const auth = JSON.parse(authStr);
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
    mintUrl: string,
  ) => {
    const message = {
      Destination: {
        ToAddresses: [
          info.handle,
        ]
      },
      Message: {
        Subject: {
          Data: "Token Drop",
          Charset: "utf-8",
        },
        Body: {
          Html: {
            Data: `You received ${info.amount} token(s) `
                + `(click <a href="${mintUrl}">here</a> to view the mint on explorer). `
                + `<a href="${info.url}">Click here to claim them!</a>`,
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

const setupManual = (auth : string, source : string) => {
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

const setupSender = (
  method : string,
  auth : string,
  source : string,
) => {
  if (method === "Mailchimp") {
    return setupMailchimp(auth, source);
  } else if (method === "AWS SES") {
    return setupSes(auth, source);
  } else if (method === "Manual") {
    return setupManual(auth, source);
  } else {
    throw new Error(`Unrecognized claim distribution method ${method}`);
  }
}

const parseClaimants = (
  input : string
) : Array<ClaimantInfo> => {
  const json = JSON.parse(input);
  return json.map(obj => {
    return {
      handle : obj.handle,
      amount : obj.amount,
      pin    : obj.pin,
      bump   : obj.bump,
      pda    : obj.pda,
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

export type CreateProps = {};

export const Create = (
  props : CreateProps,
) => {
  const connection = useConnection();
  const wallet = useWallet();
  const [mint, setMint] = React.useState(localStorage.getItem("mint") || "");
  const [commMethod, setMethod] = React.useState(localStorage.getItem("commMethod") || "");
  const [commAuth, setCommAuth] = React.useState("");
  const [commSource, setCommSource] = React.useState("");
  const [filename, setFilename] = React.useState("");
  const [text, setText] = React.useState("");
  const [baseKey, setBaseKey] = React.useState<Keypair | undefined>(undefined);
  const [claimURLs, setClaimURLs] = React.useState<Array<ClaimantInfo>>([]);

  const submit = async (e : React.SyntheticEvent) => {
    e.preventDefault();

    setBaseKey(undefined);
    setClaimURLs([]);

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
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
    const displayMintTokens = (amount : number) : string => {
      // TODO: better decimal rounding
      return (amount / Math.pow(10, mintInfo.decimals)).toString();
    };

    const mintUrl = `https://explorer.solana.com/address/${mintKey.toBase58()}?cluster=${Connection.envFor(connection)}`;
    console.log(mintUrl);


    const claimants = parseClaimants(text);
    if (claimants.length === 0) {
      throw new Error(`No claimants provided`);
    }

    const mightHaveExisting = (info : ClaimantInfo) => {
      // TODO: others?
      return info.url !== undefined && info.url !== null;
    };
    if (claimants.reduce((acc, c) => acc && mightHaveExisting(c), true)) {
      // TODO: more validation of URLs? The creator is using they're own
      // credentials to re-send so if they're malicious it's not that bad
      // right?...
      const resendOnly = await reactModal(({ show, onSubmit, onDismiss }) => {
        const options = [
          { click: () => onSubmit("create"), name: "Create and Send" },
          { click: () => onSubmit("send")  , name: "Send only"       },
        ];
        return (
          <DefaultModal visible={show} onCancel={onDismiss}>
            <p style={{ color: "white", fontSize: 14 }}>
              Uploaded distribution list has URLs for all claimants.
              Skip creation of airdrop and only re-send links?
            </p>
            <br />
            {options.map((opt) => {
              return (
                <Button
                  key={opt.name}
                  style={{
                    width: "100%",
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
          </DefaultModal>
        );
      }) as string | undefined;
      console.log(resendOnly);
      if (resendOnly === "send") {
        setClaimURLs(claimants);
        const sender = setupSender(commMethod, commAuth, commSource);
        for (let idx = 0; idx < claimants.length; ++idx) {
          await sender(claimants[idx], mintUrl);
        }
        return;
      } else if (resendOnly === "create") {
        // fallthrough to full create
      } else {
        // dismissed. don't use exceptions for control flow?
        throw new Error("Dismissed");
      }
    }
    const totalClaim = claimants.reduce((acc, c) => acc + c.amount, 0);
    claimants.forEach(c => {
      c.pin = randomBytes();
    });

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
        Buffer.from(claimant.pin),
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


    const base = new Keypair();
    console.log(`Base ${base.publicKey.toBase58()}`);
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

    for (let idx = 0; idx < claimants.length; ++idx) {
      const proof = tree.getProof(idx);
      const verified = tree.verifyProof(idx, proof, root);

      if (!verified) {
        throw new Error("Merkle tree verification failed");
      }

      const claimant = claimants[idx];
      const params = [
        `distributor=${distributor}`,
        `handle=${claimant.handle}`,
        `amount=${claimant.amount}`,
        `index=${idx}`,
        `pin=${claimant.pin}`,
        `proof=${proof.map(b => bs58.encode(b))}`,
      ];
      const query = params.join("&");

      claimant.url = `${window.location.origin}${window.location.pathname}#/claim?${query}`;
    }

    const shouldSend = await reactModal(({ show, onSubmit, onDismiss }) => {
      const options = [
        { click: () => onSubmit(true) , name: "Approve" },
        { click: () => onSubmit(false), name: "Cancel"  },
      ];
      return (
        <DefaultModal visible={show} onCancel={onDismiss}>
          <h2
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: 20,
            }}
          >
            Claim Distribution Preview
          </h2>
          <p style={{ color: "white", fontSize: 14 }}>
            Distributing a total of {displayMintTokens(totalClaim)}{WHITESPACE}
            <HyperLink href={mintUrl}>
              {shortenAddress(mintKey.toBase58())}
            </HyperLink>
            {WHITESPACE}token(s)
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
                  <TableCell>Tokens</TableCell>
                  <TableCell>Pin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claimants.map((c) => (
                  <TableRow
                    key={c.pda.toBase58()}
                    sx={{ 'td, th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">{c.handle} </TableCell>
                    <TableCell>{displayMintTokens(c.amount)}</TableCell>
                    <TableCell>{c.pin.join(",")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <br />
          {options.map((opt) => {
            return (
              <Button
                key={opt.name}
                style={{
                  width: "100%",
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
        </DefaultModal>
      );
    }) as boolean | undefined;
    console.log(shouldSend);
    if (shouldSend === true) {
    } else {
      // dismissed. don't use exceptions for control flow?
      throw new Error("Claim distribution preview not approved");
    }

    // TODO: defer until success?
    setBaseKey(base);
    setClaimURLs(claimants);

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

    const createDistributorTokenAccount = Token.createAssociatedTokenAccountInstruction(
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintKey,
        distributorTokenKey,
        distributor,
        wallet.publicKey
      );

    const transferToATA = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        creatorTokenKey,
        distributorTokenKey,
        wallet.publicKey,
        [],
        totalClaim
      );

    const createResult = await Connection.sendTransactionWithRetry(
      connection,
      wallet,
      [
        initDistributor,
        createDistributorTokenAccount,
        transferToATA,
      ],
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
    for (let idx = 0; idx < claimants.length; ++idx) {
      await sender(claimants[idx], mintUrl);
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

  const commAuthorization = (commMethod) => {
    if (commMethod === "Manual") {
      return null;
    }
    return (
      <React.Fragment>
        <TextField
          style={{width: "60ch"}}
          id="comm-auth-field"
          label={`${commMethod} API key`}
          value={commAuth}
          onChange={(e) => setCommAuth(e.target.value)}
        />
        <TextField
          style={{width: "60ch"}}
          id="comm-source-field"
          label={`${commMethod} Source`}
          value={commSource}
          onChange={(e) => setCommSource(e.target.value)}
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
            Upload a distribution list
            <input
              type="file"
              onChange={(e) => handleFiles(e.target.files)}
              hidden
            />
          </Button>
          {WHITESPACE}
          {/*For display alignment...*/}
          <Button
            variant="text"
            component="label"
            disabled={true}
            color="secondary"
            style={{padding: 0}}
          >
            or drag it here
          </Button>
        </Stack>
      </DragAndDrop>
      {filename !== ""
      ? (<Box style={{
            display: 'flex',
            justifyContent: 'center',
            width: "60ch",
            color: "rgba(255,255,255,.8)",
          }}>
            <FilePresentIcon />
            <span>{WHITESPACE} Uploaded {filename}</span>
          </Box>
        )
      : (<Box/>)}
    </React.Fragment>
  );

  const createAirdrop = (
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
              message: "Create failed",
              description: `${err}`,
            });
          }
        };
        wrap();
      }}
      sx={{ marginRight: "4px" }}
    >
      Create Merkle Airdrop
    </Button>
  );

  const hyperLinkData = (data) => {
    const encoded = encodeURIComponent(JSON.stringify(data));
    return `data:text/plain;charset=utf-8,${encoded}`;
  };

  return (
    <Stack spacing={2}>
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
      <FormControl fullWidth>
        <InputLabel id="comm-method-label">Claim Distribution Method</InputLabel>
        <Select
          labelId="comm-method-label"
          id="comm-method-select"
          value={commMethod}
          label="Claim Distribution Method"
          onChange={(e) => {
            localStorage.setItem("commMethod", e.target.value);
            setMethod(e.target.value);
          }}
          style={{textAlign: "left"}}
        >
          <MenuItem value={"Mailchimp"}>Mailchimp</MenuItem>
          <MenuItem value={"AWS SES"}>AWS SES</MenuItem>
          <MenuItem value={"Manual"}>Manual</MenuItem>
        </Select>
      </FormControl>
      {commMethod !== "" && commAuthorization(commMethod)}
      {commMethod !== "" && mint !== "" && fileUpload}
      {filename !== "" && createAirdrop}
      {baseKey !== undefined && (
        <HyperLink
          href={hyperLinkData(Array.from(baseKey.secretKey))}
          download="basekey.json"
          underline="none"
          style={{width: "100%"}}
        >
          <Button
            variant="contained"
            style={{width: "100%"}}
          >
            Download Distributor Base Secret Key
          </Button>
        </HyperLink>
      )}
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
