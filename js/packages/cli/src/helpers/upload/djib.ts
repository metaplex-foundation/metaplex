import {stat} from 'fs/promises';
import {Keypair, PublicKey} from '@solana/web3.js';
import * as fetch from 'node-fetch';
import {sendTransactionWithRetryWithKeypair} from '../transactions';
import * as splLib from '@solana/spl-token';
import * as fs from "fs";
import * as path from "path";
import FormData from 'form-data';
import log from 'loglevel';


export async function djibUpload(
  index: string,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
  walletKeyPair: Keypair,
  anchorProgram: any,
  network: string
) {
  const djibRPC = network === 'mainnet-beta' ? 'https://mainrpc.djib.io' :
    (network === 'testnet' ? 'https://testrpc.djib.io' : 'https://devrpc.djib.io');

  // get djib token payment url from djib rpc server
  async function getPaymentUrl(fSizeKB: any, filename: string) {
    const data = {
      "jsonrpc": "2.0",
      "id": 0,
      "method": "createPayment",
      "params": [
        {
          "size": fSizeKB,
          "unit": "KB"
        },
        [
          filename
        ]
      ]
    };
    const {payment, error} = await fetch(djibRPC, {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(function (res: any) {
      return res.json()
    }).then(function (res: any) {
      if (res.result == undefined || res.result.length == 0)
        return {
          "payment": undefined,
          "error": `Error on fetching djib token payment url: No Response on Djib RPC Server (${djibRPC})`
        };
      return {"payment": res.result[0], "error": undefined}
    }).catch(function (e: any) {
      return {
        "payment": undefined,
        "error": `Unknown error on fetching djib token payment url: ${e.toString()}`
      }
    })
    return {
      payment, error
    }
  }

  // parsing solana-pay url for creating transaction instruction
  function parsePaymentUrl(payUrl: string) {
    const data = {
      "recipient": "",
      "amount": 0.0,
      "spl": "",
      "error": undefined
    }
    if (payUrl == undefined)
      return data
    try {
      let items = payUrl.split("?");
      data.recipient = items[0].split(":")[1];
      items = items[1].split("&");
      for (let i = 0; i < items.length; i++) {
        const cop = items[i].split("=");
        if (cop[0] == "amount") data.amount = parseFloat(cop[1]);
        if (cop[0] == "spl-token") data.spl = cop[1];
      }
    } catch (e: any) {
      data.error = e.toString()
    }
    return data
  }

  // pay djib token for uploading
  async function payToken(toWalletStr: string, amount: any, spl: any) {
    const splToken = new PublicKey(spl);
    const fromWallet = walletKeyPair.publicKey;
    const toWallet = new PublicKey(toWalletStr);
    const connection = anchorProgram.provider.connection;
    amount = 1_000_000_000 * amount
    const fromTokenAccount = await splLib.Token.getAssociatedTokenAddress(
      splLib.ASSOCIATED_TOKEN_PROGRAM_ID,
      splLib.TOKEN_PROGRAM_ID,
      splToken,
      fromWallet
    );
    const toTokenAccount = await splLib.Token.getAssociatedTokenAddress(
      splLib.ASSOCIATED_TOKEN_PROGRAM_ID,
      splLib.TOKEN_PROGRAM_ID,
      splToken,
      toWallet
    );
    const transaction = splLib.Token.createTransferCheckedInstruction(
      splLib.TOKEN_PROGRAM_ID,
      fromTokenAccount,
      splToken,
      toTokenAccount,
      fromWallet,
      [],
      amount,
      9
    );
    let error = undefined;
    let trx = undefined;
    trx = await sendTransactionWithRetryWithKeypair(
      connection,
      walletKeyPair,
      [transaction],
      [],
      'confirmed',
    ).catch(function (e) {
      log.debug(e.toString());
      error = "Insufficient amount for Djib token!";
    });
    return {trx, error}
  }

  // upload file on djib network
  async function uploadFile(txid: string, fileBuff: any, contentType: any, filename: string) {
    const data = new FormData()
    data.append('txid', txid);
    data.append('publickey', walletKeyPair.publicKey.toString());
    data.append('type', 'public');
    data.append('files[]', fileBuff, {
      filename: filename,
      contentType: contentType
    })
    const {link, error} = await fetch(`${djibRPC}/upload`, {
      method: 'POST',
      body: data
    }).then(function (res: any) {
      return res.json()
    }).then(function (res: any) {
      if (res.result == undefined || res.result.length == 0)
        return {"link": "", "error": `No Response (${djibRPC}/upload)`};
      return {"link": res.result[0], "error": undefined}
    }).catch(function (e: any) {
      return {"link": "", "error": e.toString()}
    })
    return {
      link, error
    }
  }

  // pay and upload controller
  async function payAndUpload(fileBuff: any, sizeKB: any, filename: any, contentType: any) {
    const paymentUrlObj = await getPaymentUrl(sizeKB, "file");
    if (paymentUrlObj.error != undefined)
      return {error: paymentUrlObj.error};
    const paymentObj = parsePaymentUrl(paymentUrlObj.payment);
    if (paymentObj.error != undefined)
      return {error: paymentObj.error};
    log.debug(`Djib token estimated cost for ${filename} (${sizeKB}KB) is ${paymentObj.amount}`);
    const trxObj = await payToken(paymentObj.recipient, paymentObj.amount, paymentObj.spl);
    if (trxObj.error != undefined)
      return {error: trxObj.error};
    log.debug(`Djib token payed transaction: ${trxObj.trx}`);
    const linkObj = await uploadFile(trxObj.trx.txid, fileBuff, contentType, filename);
    if (linkObj.error != undefined)
      return {error: linkObj.error};
    log.info(`Uploaded link for ${filename}: ${linkObj.link}`);
    return {error: undefined, link: linkObj.link};
  }

  // process media file
  async function processMedia(filePath: string) {
    const fileSize = (await stat(filePath)).size / 1024;
    const fileExt = path.extname(filePath);
    const fileName = `${index}${fileExt}`;
    const fileContentType = `image/${fileExt.replace('.', '')}`;
    return await payAndUpload(fs.createReadStream(filePath), fileSize, fileName, fileContentType);
  }

  // process manifest file
  async function processJson(manifestJson: any) {
    const strManifest = JSON.stringify(manifestJson);
    const jsonBuff = Buffer.from(strManifest);
    const fileSize = jsonBuff.byteLength / 1024;
    const fileName = `${index}.json`;
    const fileContentType = `text/json`;
    return await payAndUpload(jsonBuff, fileSize, fileName, fileContentType);
  }

  const imageObj = await processMedia(image);
  if(imageObj.error != undefined) {
    log.error(imageObj.error);
    return null;
  }
  const animationObj = animation ? await processMedia(animation) : undefined;
  if(animationObj && animationObj.error != undefined) {
    log.error(animationObj.error);
    return null;
  }
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageObj.link;
  if (animation)
    manifestJson.animation_url = animationObj.link;
  const manifestObj = await processJson(manifestJson);
  if(manifestObj.error != undefined) {
    log.error(manifestObj.error);
    return null;
  }
  return [
    manifestObj.link, imageObj.link, animationObj ? animationObj.link : undefined
  ]
}
