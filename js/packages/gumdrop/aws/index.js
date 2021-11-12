const { sha256 } = require("js-sha256");
const { Keypair, Message, PublicKey, Transaction } = require("@solana/web3.js");
const BN = require("bn.js");
const bs58 = require("bs58");
const nacl = require("tweetnacl");
const discord = require("discord.js");

const MERKLE_DISTRIBUTOR_ID = new PublicKey(process.env.MA_DISTRIBUTOR_ID);
const CLAIM_INSTR = Buffer.from(sha256.digest("global:claim")).slice(0, 8);
const CANDY_INSTR = Buffer.from(sha256.digest("global:claim_candy")).slice(0, 8);
const EDITION_INSTR = Buffer.from(sha256.digest("global:claim_edition")).slice(0, 8);
const SIGNER = Keypair.fromSecretKey(Buffer.from(JSON.parse(process.env.MA_SIGNER)));

const OTP_SECRET = Buffer.from(JSON.parse(process.env.MA_OTP_SECRET));
const OTP_TABLE_NAME = process.env.MA_OTP_TABLE_NAME;

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'us-east-2' });

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

const chunk = (arr, len) => {
  let chunks = [],
      i = 0,
      n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}

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

  let pda;
  if (Buffer.from(claim.data.slice(0, 8)).equals(CLAIM_INSTR)) {
    pda = claim.data.slice(25, 25 + 32);
  } else if (Buffer.from(claim.data.slice(0, 8)).equals(CANDY_INSTR)) {
    pda = claim.data.slice(26, 26 + 32);
  } else if (Buffer.from(claim.data.slice(0, 8)).equals(EDITION_INSTR)) {
    pda = claim.data.slice(33, 33+ 32);
  } else {
    throw new Error("Claim instruction does not match");
  }

  const [claimantPda, ] = await PublicKey.findProgramAddress(
    [
      event.seeds[0].data,
      ...chunk(event.seeds[1].data, 32),
      event.seeds[2].data,
    ],
    MERKLE_DISTRIBUTOR_ID
  );

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

  const otpMessage = `Your gumdrop OTP is ${String(otp).padStart(8, "0")}`;
  switch (event.comm) {
    case "discord": {
      const client = new discord.Client();
      await client.login(process.env.DISCORD_BOT_TOKEN);

      const user = await client.users.fetch(handle);
      if (!user) {
        throw new Error(`Could not find discord user ${handle}`);
      }
      return await user.send(otpMessage);
    }
    case "aws-sms": {
      const params = {
        Message: otpMessage,
        PhoneNumber: handle,
      };

      const sns = new AWS.SNS({ region: "us-east-1" });
      return sns.publish(params).promise();
    }
    case "aws-email":
    default: {
      const params = {
        Destination: {
          ToAddresses: [handle],
        },
        Message: {
          Body: {
            Text: { Data: otpMessage },
          },

          Subject: { Data: "Gumdrop OTP" },
        },
        Source: "santa@aws.metaplex.com",
      };

      const ses = new AWS.SES({ region: "us-east-2" });
      return ses.sendEmail(params).promise();
    }
  }
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

exports.handler = async (request) => {
  // we need to populate these for pre-flight options requests or something...
  // not sure why we need both this AND to set CORS in the API gateway but OK...
  const amazing = {
    headers: {
      "Access-Control-Allow-Origin": '*',
      "Access-Control-Allow-Methods": 'POST,OPTIONS',
      "Access-Control-Allow-Headers" : "Content-Type",
    }
  }
  if (request.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      ...amazing,
    }
  }
  const event = JSON.parse(request.body);
  if (event.method === "send") {
    return await sendOTP(event);
  } else if (event.method === "verify") {
    return await verifyOTP(event);
  } else {
    throw new Error("Could not find method");
  }
}
