import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  ParsedAccount,
  sendTransactions,
  SequenceType,
  sendTransactionWithRetry,
  Metadata,
  MasterEditionV1,
  MasterEditionV2,
  MetadataKey,
  convertMasterEditionV1ToV2,
  TokenAccount,
  programIds,
  toPublicKey,
} from '@oyster/common';
import { Token } from '@solana/spl-token';
const BATCH_SIZE = 10;
const CONVERT_TRANSACTION_SIZE = 10;

export async function filterMetadata(
  connection: Connection,
  metadata: ParsedAccount<Metadata>[],
  masterEditions: Record<
    string,
    ParsedAccount<MasterEditionV1 | MasterEditionV2>
  >,
  accountsByMint: Map<string, TokenAccount>,
): Promise<{
  available: ParsedAccount<MasterEditionV1>[];
  unavailable: ParsedAccount<MasterEditionV1>[];
}> {
  const available = [];
  const unavailable = [];
  let batchWaitCounter = 0;

  for (let i = 0; i < metadata.length; i++) {
    const md = metadata[i];
    const masterEdition = masterEditions[
      md.info.masterEdition || ''
    ] as ParsedAccount<MasterEditionV1>;
    if (
      masterEdition &&
      masterEdition?.info.key == MetadataKey.MasterEditionV1
    ) {
      if (batchWaitCounter == 10) {
        console.log('Waiting 10s before continuing to avoid rate limits');
        await new Promise(resolve => setTimeout(resolve, 10000));
        batchWaitCounter = 0;
      }
      console.log('Reviewing', masterEdition.pubkey);
      let printingBal = 0;
      try {
        let printingBalResp = await connection.getTokenSupply(
          toPublicKey(masterEdition.info.printingMint),
        );
        printingBal = printingBalResp.value.uiAmount || 0;
      } catch (e) {
        console.error(e);
      }

      const myAcct = accountsByMint.get(masterEdition.info.printingMint);
      if (myAcct) {
        console.log(
          'Existing print account subtracts',
          myAcct.info.amount.toNumber(),
          'from',
          printingBal,
        );
        printingBal -= myAcct.info.amount.toNumber();
      }

      if (printingBal > 0) {
        console.log(
          'Reject',
          masterEdition.pubkey,
          'due to printing bal of',
          printingBal,
        );
        unavailable.push(masterEdition);
      } else {
        let oneTimeBal = 0;
        try {
          let oneTimeBalResp = await connection.getTokenSupply(
            toPublicKey(masterEdition.info.oneTimePrintingAuthorizationMint),
          );
          oneTimeBal = oneTimeBalResp.value.uiAmount || 0;
        } catch (e) {
          console.error(e);
        }

        const myAcct = accountsByMint.get(
          masterEdition.info.oneTimePrintingAuthorizationMint,
        );
        if (myAcct) {
          console.log(
            'Existing one time account subtracts',
            myAcct.info.amount.toNumber(),
            'from',
            oneTimeBal,
          );
          oneTimeBal -= myAcct.info.amount.toNumber();
        }

        if (oneTimeBal > 0) {
          console.log(
            'Reject',
            masterEdition.pubkey,
            'due to one time auth bal of',
            oneTimeBal,
          );
          unavailable.push(masterEdition);
        } else {
          available.push(masterEdition);
        }
      }

      batchWaitCounter++;
    }
  }

  return { available, unavailable };
}
// Given a vault you own, unwind all the tokens out of it.
export async function convertMasterEditions(
  connection: Connection,
  wallet: any,
  masterEditions: ParsedAccount<MasterEditionV1>[],
  accountsByMint: Map<string, TokenAccount>,
) {
  const PROGRAM_IDS = programIds();
  let signers: Array<Array<Keypair[]>> = [];
  let instructions: Array<Array<TransactionInstruction[]>> = [];

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

  let convertSigners: Keypair[] = [];
  let convertInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  for (let i = 0; i < masterEditions.length; i++) {
    const masterEdition = masterEditions[i] as ParsedAccount<MasterEditionV1>;

    console.log('Converting', masterEdition.pubkey);
    const printingMintAcct = accountsByMint.get(
      masterEdition.info.printingMint,
    );
    const oneTimeAuthMintAcct = accountsByMint.get(
      masterEdition.info.oneTimePrintingAuthorizationMint,
    );
    if (printingMintAcct) {
      if (printingMintAcct.info.amount.toNumber() > 0) {
        convertInstructions.push(
          Token.createBurnInstruction(
            PROGRAM_IDS.token,
            toPublicKey(masterEdition.info.printingMint),
            toPublicKey(printingMintAcct.pubkey),
            wallet.publicKey,
            [],
            printingMintAcct.info.amount,
          ),
        );
      }

      convertInstructions.push(
        Token.createCloseAccountInstruction(
          PROGRAM_IDS.token,
          toPublicKey(printingMintAcct.pubkey),
          wallet.publicKey,
          wallet.publicKey,
          [],
        ),
      );
    }

    if (oneTimeAuthMintAcct) {
      if (oneTimeAuthMintAcct.info.amount.toNumber() > 0) {
        convertInstructions.push(
          Token.createBurnInstruction(
            PROGRAM_IDS.token,
            toPublicKey(masterEdition.info.oneTimePrintingAuthorizationMint),
            toPublicKey(oneTimeAuthMintAcct.pubkey),
            wallet.publicKey,
            [],
            oneTimeAuthMintAcct.info.amount,
          ),
        );
      }

      convertInstructions.push(
        Token.createCloseAccountInstruction(
          PROGRAM_IDS.token,
          toPublicKey(oneTimeAuthMintAcct.pubkey),
          wallet.publicKey,
          wallet.publicKey,
          [],
        ),
      );
    }

    await convertMasterEditionV1ToV2(
      masterEdition.pubkey,
      masterEdition.info.oneTimePrintingAuthorizationMint,
      masterEdition.info.printingMint,
      convertInstructions,
    );

    if (convertInstructions.length === CONVERT_TRANSACTION_SIZE) {
      currSignerBatch.push(convertSigners);
      currInstrBatch.push(convertInstructions);
      convertSigners = [];
      convertInstructions = [];
    }

    if (currInstrBatch.length === BATCH_SIZE) {
      signers.push(currSignerBatch);
      instructions.push(currInstrBatch);
      currSignerBatch = [];
      currInstrBatch = [];
    }
  }

  if (
    convertInstructions.length < CONVERT_TRANSACTION_SIZE &&
    convertInstructions.length > 0
  ) {
    currSignerBatch.push(convertSigners);
    currInstrBatch.push(convertInstructions);
  }

  if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
    // add the last one on
    signers.push(currSignerBatch);
    instructions.push(currInstrBatch);
  }
  console.log('Instructions', instructions);
  for (let i = 0; i < instructions.length; i++) {
    const instructionBatch = instructions[i];
    const signerBatch = signers[i];
    console.log('Running batch', i);
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'single',
      );
    else
      await sendTransactionWithRetry(
        connection,
        wallet,
        instructionBatch[0],
        signerBatch[0],
        'single',
      );
    console.log('Done');
  }
}
