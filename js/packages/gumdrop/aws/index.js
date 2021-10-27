const { sha256 } = require("js-sha256");
const { Keypair, Message, PublicKey, Transaction } = require("@solana/web3.js");
const BN = require("bn.js");
const bs58 = require("bs58");
const nacl = require("tweetnacl");

const MERKLE_DISTRIBUTOR_ID = new PublicKey(process.env.MA_DISTRIBUTOR_ID);
const CLAIM_INSTR = Buffer.from(sha256.digest("global:claim")).slice(0, 8);
const SIGNER = Keypair.fromSecretKey(Buffer.from(JSON.parse(process.env.MA_SIGNER)));

const OTP_SECRET = Buffer.from(JSON.parse(process.env.MA_OTP_SECRET));
const OTP_TABLE_NAME = process.env.MA_OTP_TABLE_NAME;

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'us-east-2' });
const ses = new AWS.SES({ region: "us-east-2" });

// time in MS (normally Date.now())
const OTP_X = Number(process.env.MA_OTP_X);
const generateTOTP = (key, time, digits) => {
  const T0 = 0;

  const T = (new BN(time).sub(new BN(T0))).div(new BN(OTP_X));
  const msg = T.toBuffer();
  // should be OK to truncate...
  const hash = Buffer.from(sha256.hmac(key, msg)).slice(0, 20);
  const offset = hash[hash.length - 1] & 0xf;
  const bytes = hash.slice(offset, offset + 4);

  const binary = new BN(bytes);
  const otp = binary.umod(new BN(10).pow(new BN(digits)));
  return otp.toNumber();
};

const queryDB = async (handle) => {
  const params = {
    TableName: OTP_TABLE_NAME,
    Key: {
      "HANDLE": handle
    }
  };
  const result = await ddb.get(params).promise();
  return result.Item;
};

const logDB = async (handle, otp, txn) => {
  const params = {
    TableName: OTP_TABLE_NAME,
    Item: {
      "HANDLE": handle,
      "OTP": otp,
      "TXN": txn,
    },
  };
  await ddb.put(params).promise();
};

const sendOTP = async (event) => {
  if (!event.transaction) {
    throw new Error("No transaction found");
  }
  if (!event.seeds) {
    throw new Error("No PDA seeds found");
  }
  if (event.seeds.length !== 3) {
    throw new Error("Expected exactly 3 seeds. [mint, handle, pin]");
  }

  const serializedBuffer = bs58.decode(event.transaction);
  const transaction = Transaction.populate(Message.from(serializedBuffer));

  const instrs = transaction.instructions;
  const claim = instrs[instrs.length - 1];
  if (!claim.programId.equals(MERKLE_DISTRIBUTOR_ID)) {
    throw new Error("Claim programId does not match");
  }
  if (Buffer.from(claim.data.slice(0, 8)) === CLAIM_INSTR) {
    throw new Error("Claim instruction does not match");
  }

  const [claimantPda, ] = await PublicKey.findProgramAddress(
    event.seeds.map(s => s.data),
    MERKLE_DISTRIBUTOR_ID
  );

  const pda = claim.data.slice(25, 25 + 32);
  if (!claimantPda.toBuffer().equals(Buffer.from(pda))) {
    throw new Error("Claim PDA does not match provided seeds");
  }

  const handle = Buffer.from(event.seeds[1].data).toString();

  // OTP shouldn't be returned as part of response... don't log here?
  const time = Date.now();
  const otp = generateTOTP(OTP_SECRET, time, 8);

  const previous = await queryDB(handle);
  if (previous) {
    if (previous.OTP === otp) {
      throw new Error("Wait for new OTP cycle");
    }
  }

  // TODO: there seems to be some race condition here... the 'secret' pin
  // should actually help in this case?
  await logDB(handle, time, serializedBuffer);

  const params = {
    Destination: {
      ToAddresses: [handle],
    },
    Message: {
      Body: {
        Text: { Data: `Your airdrop OTP is ${String(otp).padStart(8, "0")}` },
      },

      Subject: { Data: "Token Drop" },
    },
    Source: "santa@aws.metaplex.com",
  };

  return ses.sendEmail(params).promise();
};

const verifyOTP = async (event) => {
  if (!event.handle) {
    throw new Error("No handle found");
  }
  if (!event.otp) {
    throw new Error("No OTP found");
  }

  const stored = await queryDB(event.handle);
  if (!stored) {
    throw new Error("No DB entry found");
  }

  const time = Date.now();
  const expectedOTP = generateTOTP(OTP_SECRET, time, 8);
  const delayedOTP  = generateTOTP(OTP_SECRET, time - OTP_X, 8);

  if (event.otp !== expectedOTP && event.otp !== delayedOTP) {
    throw new Error("OTP does not match expected");
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify(bs58.encode(nacl.sign.detached(stored.TXN, SIGNER.secretKey))),
  };
  return response;
};

exports.handler = async (event) => {
  if (event.method === "send") {
    return await sendOTP(event);
  } else if (event.method === "verify") {
    return await verifyOTP(event);
  } else {
    throw new Error("Could not find method");
  }
}
