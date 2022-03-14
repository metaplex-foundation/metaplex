import { SystemProgram, Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js'

export interface WalletAdapter {
  publicKey: PublicKey | null
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  connect: () => any
  disconnect: () => any
}

export async function sendStoreFee(
  destPubkeyStr: string,
  lamports: number,
  wallet: any,
  connection: any
) {
  try {
    console.log('starting sendMoney')
    const destPubkey = new PublicKey(destPubkeyStr)
    const walletAccountInfo = await connection.getAccountInfo(wallet!.publicKey!)
    console.log('wallet data size', walletAccountInfo?.data.length)

    const receiverAccountInfo = await connection.getAccountInfo(destPubkey)
    console.log('receiver data size', receiverAccountInfo?.data.length)

    const instruction = SystemProgram.transfer({
      fromPubkey: wallet!.publicKey!,
      toPubkey: destPubkey,
      lamports, // about half a SOL
    })
    let trans = await setWalletTransaction(instruction, connection, wallet)

    let signature = await signAndSendTransaction(connection, wallet, trans)
    let result = await connection.confirmTransaction(signature, 'singleGossip')
    console.log('money sent', result)
  } catch (e) {
    console.warn('Failed', e)
  }
}

export async function setWalletTransaction(
  instruction: TransactionInstruction,
  connection: any,
  wallet: any
): Promise<Transaction> {
  const transaction = new Transaction()
  transaction.add(instruction)
  transaction.feePayer = wallet!.publicKey!
  let hash = await connection.getRecentBlockhash()
  console.log('blockhash', hash)
  transaction.recentBlockhash = hash.blockhash
  return transaction
}

export async function signAndSendTransaction(
  connection: any,
  wallet: any,
  transaction: Transaction
): Promise<string> {
  let signedTrans = await wallet.signTransaction(transaction)
  console.log('sign transaction')
  let signature = await connection.sendRawTransaction(signedTrans.serialize())
  console.log('send raw transaction')
  return signature
}
