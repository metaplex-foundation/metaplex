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
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  MintInfo,
} from "@solana/spl-token";
import BN from 'bn.js';

import {
  useConnection,
  Connection,
} from "../contexts";
import {
  GUMDROP_DISTRIBUTOR_ID,
  GUMDROP_TEMPORAL_SIGNER,
  notify,
  shortenAddress,
} from "../utils";
import {
  ClaimantInfo,
  buildGumdrop,
  parseClaimants,
  validateTransferClaims,
  validateCandyClaims,
  validateEditionClaims,
} from "../utils/claimant";
import {
  AuthKeys,
  setupSes,
  setupManual,
  setupWalletListUpload,
} from "../utils/communication";
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
              {claimants.map((c, idx) => (
                <TableRow
                  key={idx}
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

    let claimInfo;
    switch (claimMethod) {
      case "transfer": {
        claimInfo = await validateTransferClaims(
          connection,
          Connection.envFor(connection),
          wallet.publicKey,
          claimants,
          mint,
        );
        break;
      }
      case "candy": {
        claimInfo = await validateCandyClaims(
          connection,
          Connection.envFor(connection),
          wallet.publicKey,
          claimants,
          candyConfig,
          candyUUID,
        );
        break;
      }
      case "edition": {
        claimInfo = await validateEditionClaims(
          connection,
          Connection.envFor(connection),
          wallet.publicKey,
          claimants,
          masterMint,
        );
        break;
      }
      default:
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

    // temporal auth is the AWS signer by 'default' and a no-op key otherwise
    let temporalSigner;
    if (commMethod === "Wallets") {
      // TODO: this is a bit jank. There should be no form option to set the
      // OTP auth if we are using a wallet but there's still a defaulted value
      // atm...
      // NB: We also need this to not be 'none' since there is a special check
      // for claimant_secret==accounts.temporal
      temporalSigner = GUMDROP_DISTRIBUTOR_ID;
    } else if (otpAuth === "default") {
      temporalSigner = GUMDROP_TEMPORAL_SIGNER;
    } else if (otpAuth === "none") {
      temporalSigner = PublicKey.default;
    } else {
      throw new Error(`Unknown OTP authorization type ${otpAuth}`);
    }

    console.log(`Temporal signer: ${temporalSigner.toBase58()}`);

    const base = Keypair.generate();
    console.log(`Base ${base.publicKey.toBase58()}`);

    const needsPin = commMethod !== "Wallets";
    const instructions = await buildGumdrop(
      connection,
      wallet.publicKey,
      needsPin,
      claimMethod,
      `${window.location.origin}${window.location.pathname}`,
      base.publicKey,
      temporalSigner,
      claimants,
      claimInfo
    );

    const shouldSend = await reactModal(
      shouldSendRender(claimants, needsPin, claimMethod, claimInfo, base)
    ) as boolean | undefined;
    if (shouldSend === true) {
    } else {
      // dismissed. don't use exceptions for control flow?
      throw new Error("Claim distribution preview not approved");
    }


    setClaimURLs(claimants);

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
        message: "Gumdrop creation succeeded",
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
              href={explorerUrlFor(GUMDROP_TEMPORAL_SIGNER)}
              underline="none"
              target="_blank" rel="noopener noreferrer"
            >
              ({shortenAddress(GUMDROP_TEMPORAL_SIGNER.toBase58())})
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
