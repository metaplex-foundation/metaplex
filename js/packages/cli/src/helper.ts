// const createPaymentTransaction = () => {
//   // TODO:
//   const tx = new Transaction();
//   tx.add(SystemProgram.transfer({
//     fromPubkey: walletKey.publicKey,
//     toPubkey: PAYMENT_WALLET,
//     lamports: storageCost,
//   }));

//   try {
//     console.log(SystemInstruction.decodeTransfer(tx.instructions[0]));


//   } catch {
//     // TODO: handle errors during decode
//   }

//   const block = await connection.getRecentBlockhash();
//   tx.recentBlockhash = block.blockhash;
//   tx.feePayer = walletKey.publicKey;
//   tx.partialSign(walletKey);

//   const serializedTransaction = tx.compileMessage().serialize().toString('base64');

//   // this means we're done getting AR txn setup. Ship it off to ARWeave!
//   const data = new FormData();

//   // const tags = realFiles.reduce(
//   //   (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
//   //     acc[f.name] = [{ name: 'mint', value: mintKey }];
//   //     return acc;
//   //   },
//   //   {},
//   // );
// }
