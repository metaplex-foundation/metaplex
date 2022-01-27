import log from 'loglevel';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

import { ClaimantInfo, Claimants } from './claimant';

export type AuthKeys = { [key: string]: string };
export type Response = { [key: string]: any };

export type DropInfo = {
  type: string;
  meta: string;
};

export const formatDropMessage = (
  info: ClaimantInfo,
  drop: DropInfo,
  html: boolean,
) => {
  const wrap = (url, text) => {
    if (html) {
      return `<a href="${url}">${text}</a>`;
    } else {
      return `${text} ${url}`;
    }
  };
  if (drop.type === 'Token') {
    return {
      subject: 'Gumdrop Token Drop',
      message:
        `You received ${info.amount} token(s) ` +
        `(click ${wrap(
          drop.meta,
          'here',
        )} to view more information about the token mint). ` +
        wrap(info.url, 'Click here to claim them!'),
    };
  } else if (drop.type === 'Candy') {
    return {
      subject: 'Gumdrop NFT Drop',
      message:
        `You received ${info.amount} Candy Machine pre-sale mint(s) ` +
        `(click ${wrap(
          drop.meta,
          'here',
        )} to view the candy machine configuration on explorer). ` +
        wrap(info.url, 'Click here to claim them!'),
    };
  } else if (drop.type === 'Edition') {
    return {
      subject: 'Gumdrop NFT Drop',
      message:
        `You received ${info.amount} limited-edition print(s) ` +
        `(click ${wrap(
          drop.meta,
          'here',
        )} to view the master edition mint on explorer). ` +
        wrap(info.url, 'Click here to claim them!'),
    };
  } else {
    throw new Error(`Internal Error: Unknown drop type ${drop.type}`);
  }
};

export const distributeAwsSns = async (
  auth: AuthKeys,
  source: string,
  claimants: Claimants,
  drop: DropInfo,
) => {
  if (!auth.accessKeyId || !auth.secretAccessKey) {
    throw new Error('AWS SNS auth keys not supplied');
  }
  if (claimants.length === 0) return [];

  log.debug('SNS auth', auth);
  const client = new SNSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
    },
  });

  const single = async (info: ClaimantInfo, drop: DropInfo) => {
    const formatted = formatDropMessage(info, drop, false);
    const message = {
      Message: formatted.message,
      PhoneNumber: info.handle,
    };

    try {
      const response = await client.send(new PublishCommand(message));
      return {
        status: 'success',
        handle: info.handle,
        messageId: response.MessageId,
      };
    } catch (err) {
      return {
        status: 'error',
        handle: info.handle,
        error: err,
      };
    }
  };

  const responses = Array<Response>();
  for (const c of claimants) {
    responses.push(await single(c, drop));
  }
  return responses;
};

export const distributeAwsSes = async (
  auth: AuthKeys,
  source: string,
  claimants: Claimants,
  drop: DropInfo,
) => {
  if (!auth.accessKeyId || !auth.secretAccessKey) {
    throw new Error('AWS SES auth keys not supplied');
  }
  if (claimants.length === 0) return [];

  log.debug('SES auth', auth);
  const client = new SESv2Client({
    region: 'us-east-2',
    credentials: {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
    },
  });

  // TODO: move to template + bulk message?
  const single = async (info: ClaimantInfo, drop: DropInfo) => {
    const formatted = formatDropMessage(info, drop, true);
    const message = {
      Destination: {
        ToAddresses: [info.handle],
      },
      Content: {
        Simple: {
          Subject: {
            Data: formatted.subject,
            Charset: 'utf-8',
          },
          Body: {
            Html: {
              Data:
                formatted.message +
                '<br><br>' +
                '<div>' +
                'If you would like to unsubscribe from new Gumdrops, ' +
                'change your subscription preferences here: ' +
                "<a href='{{amazonSESUnsubscribeUrl}}'>AWS subscription preferences</a>" +
                '</div>',
              Charset: 'utf-8',
            },
          },
        },
      },
      FromEmailAddress: source,
      ListManagementOptions: {
        ContactListName: 'Gumdrop',
        TopicName: drop.type,
      },
    };

    try {
      const response = await client.send(new SendEmailCommand(message));
      return {
        status: 'success',
        handle: info.handle,
        messageId: response.MessageId,
      };
    } catch (err) {
      return {
        status: 'error',
        handle: info.handle,
        error: err,
      };
    }
  };

  const responses = Array<Response>();
  for (const c of claimants) {
    responses.push(await single(c, drop));
  }
  return responses;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export const distributeManual = async (
  auth: AuthKeys,
  source: string,
  claimants: Claimants,
  drop: DropInfo,
) => {
  return Array<Response>();
};

export const distributeWallet = async (
  auth: AuthKeys,
  source: string,
  claimants: Claimants,
  drop: DropInfo,
) => {
  return Array<Response>();
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export const urlAndHandleFor = (claimants: Array<ClaimantInfo>) => {
  return claimants.map(info => {
    return {
      handle: info.handle,
      amount: info.amount,
      url: info.url,
    };
  });
};
