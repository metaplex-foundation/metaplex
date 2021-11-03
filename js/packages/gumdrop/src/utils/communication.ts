import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

import { ClaimantInfo } from "./claimant"

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
  } else if (drop.type === "Candy") {
    return {
      subject: "Gumdrop NFT Drop",
      message: `You received ${info.amount} Candy Machine pre-sale mint `
             + `(click <a href="${drop.meta}">here</a> to view the config on explorer). `
             + `<a href="${info.url}">Click here to claim it!</a>`,
    };
  } else if (drop.type === "Edition") {
    return {
      subject: "Gumdrop NFT Drop",
      message: `You received ${info.amount} limited-edition print `
             + `(click <a href="${drop.meta}">here</a> to view the master on explorer). `
             + `<a href="${info.url}">Click here to claim it!</a>`,
    };
  } else {
    throw new Error(`Internal Error: Unknown drop type ${drop.type}`);
  }
};

export const setupSes = (auth : AuthKeys, source : string) => {
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

export const setupManual = (auth : AuthKeys, source : string) => {
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

export const setupWalletListUpload = (auth : AuthKeys, source : string) => {
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
