import { Keypair, PublicKey, TransactionInstruction, Connection, AccountInfo } from '@solana/web3.js';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import * as borsh from "borsh"
import {
  MAX_NAME_LENGTH,
  MAX_URI_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_CREATOR_LEN,
  TOKEN_METADATA_PROGRAM_ID,
} from '../helpers/constants';
import {
  AccountAndPubkey,
  Metadata,
  METADATA_SCHEMA
} from '../types'
/*
 Get accounts by candy machine creator address
 Get only verified ones
 Get only unverified ones with creator address
 Grab n at a time and batch sign and send transaction

 PS: Don't sign candy machine addresses that you do not know about. Signing verifies your participation.
*/
async function decodeMetadata(buffer) {
  const metadata = borsh.deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);
  return metadata;
};

async function getProgramAccounts(
  connection: Connection,
  programId: String,
  configOrCommitment?: any,
): Promise<Array<AccountAndPubkey>> {
  const extra: any = {};
  let commitment;
  //let encoding;

  if (configOrCommitment) {
    if (typeof configOrCommitment === 'string') {
      commitment = configOrCommitment;
    } else {
      commitment = configOrCommitment.commitment;
      //encoding = configOrCommitment.encoding;

      if (configOrCommitment.dataSlice) {
        extra.dataSlice = configOrCommitment.dataSlice;
      }

      if (configOrCommitment.filters) {
        extra.filters = configOrCommitment.filters;
      }
    }
  }

  const args = connection._buildArgs([programId], commitment, 'base64', extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    'getProgramAccounts',
    args,
  );
  //console.log(unsafeRes)
  const data = (
    unsafeRes.result as Array<{
      account: AccountInfo<[string, string]>;
      pubkey: string;
    }>
  ).map(item => {
    return {
      account: {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(item.account.data[0], 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: item.account.owner,
      } as AccountInfo<Buffer>,
      pubkey: item.pubkey,
    };
  });

  return data;
}

export async function signAllMetadataFromCandyMachine(
  connection, 
  wallet, 
  candyMachineAddress, 
  batchSize
  ){
  let metadataByCandyMachine = await getAccountsByCreatorAddress(candyMachineAddress, connection)
  console.log(`Found ${metadataByCandyMachine.length} nft's minted by candy machine ${candyMachineAddress}`)
  let candyVerifiedListToSign = await getCandyMachineVerifiedMetadata(metadataByCandyMachine, candyMachineAddress, wallet.publicKey.toBase58())
  console.log(`Found ${candyVerifiedListToSign.length} nft's to sign by  ${wallet.publicKey.toBase58()}`)
  await sendSignMetadata(connection, wallet, candyVerifiedListToSign, batchSize)
}

async function getAccountsByCreatorAddress(creatorAddress, connection) {
  let metadataAccounts = await getProgramAccounts(connection, TOKEN_METADATA_PROGRAM_ID.toBase58(), {
    filters: [
      {
        memcmp: {
          offset:
            1 + // key
            32 + // update auth
            32 + // mint
            4 + // name string length
            MAX_NAME_LENGTH + // name
            4 + // uri string length
            MAX_URI_LENGTH + // uri*
            4 + // symbol string length
            MAX_SYMBOL_LENGTH + // symbol
            2 + // seller fee basis points
            1 + // whether or not there is a creators vec
            4 + // creators vec length
            0 * MAX_CREATOR_LEN,
          bytes: creatorAddress,
        },
      },
    ],
  })
  let decodedAccounts = []
  for (let i = 0; i < metadataAccounts.length; i++) {
    let e = metadataAccounts[i];
    let decoded = await decodeMetadata(e.account.data)
    let accountPubkey = e.pubkey
    let store = [decoded, accountPubkey]
    decodedAccounts.push(store)
  }
  return decodedAccounts
}

async function getCandyMachineVerifiedMetadata(metadataList, candyAddress, creatorAddress){
  let verifiedList = [];
  metadataList.forEach(meta => {
    let verifiedCandy = false;
    let verifiedCreator = true;
    meta[0].data.creators.forEach(creator => {
      if (new PublicKey(creator.address).toBase58() == candyAddress && creator.verified === 1) {
        verifiedCandy = true;
      }
      if (new PublicKey(creator.address).toBase58() == creatorAddress && creator.verified === 0) {
        verifiedCreator = false;
      }
    });
    if(verifiedCandy && !verifiedCreator){
      verifiedList.push(meta)
    }
  });
  return verifiedList
}

async function sendSignMetadata(
  connection,
  wallet,
  metadataList,
  batchsize
) {
  let total = 0;
  while(metadataList.length > 0){
    console.log("Signing metadata")
    let sliceAmount = batchsize;
    if (metadataList.length < batchsize) {
      sliceAmount = metadataList.length;
    }
    var removed = metadataList.splice(0,sliceAmount);
    total += sliceAmount;
    await delay(500)
    await signMetadataBatch(removed, connection, wallet)
    console.log(`Processed ${total} nfts`)
  }
  console.log("Finished signing metadata..")
}

async function signMetadataBatch(metadataList, connection, keypair){
  
  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  for (let i = 0; i < metadataList.length; i++) {
    const meta = metadataList[i];
    await signMetadataSingle(meta[1], keypair.publicKey.toBase58(), instructions)
  }
  await sendTransactionWithRetryWithKeypair(connection, keypair, instructions, [], 'single')
}

async function signMetadataSingle(
  metadata,
  creator,
  instructions,
) {
  const data = Buffer.from([7]);
  const keys = [
    {
      pubkey: new PublicKey(metadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(creator),
      isSigner: true,
      isWritable: false,
    },
  ];
  instructions.push(
    ({
      keys,
      programId: TOKEN_METADATA_PROGRAM_ID.toBase58(),
      data,
    }),
  );
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
