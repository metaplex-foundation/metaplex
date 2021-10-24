import { decodeMasterEdition, pubkeyToString } from '@oyster/common';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import {
  WhitelistedAuctionManagerParser,
  WhitelistedCreatorParser,
  WhitelistedEditionParser,
  WhitelistedMasterEditionVParser,
  WhitelistedMetadataParser,
} from '../models/types';

export const DEFAULT_COLLECTION_FAMILY = 'Ninja';

export const getMetadata = async () => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedMetadataParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getMetdataByPubKey = async (pubKey: string) => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?pubkey=${pubKey}`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedMetadataParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getMetdataByCreator = async (creator: string) => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?creator=${creator}`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedMetadataParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getMasterEditions = async (edition: string) => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/${edition}`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        rentEpoch: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedMasterEditionVParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getCreator = async () => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/creators`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedCreatorParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getEditions = async () => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/editions`,
    );

    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedEditionParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getCollection = async (name: string) => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctionManagers?collection=${name}`,
    );
    
    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        price: item.price,
        collection: item.collection,
        metadata: item.metadata,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
        price: item.price,
        collection: item.collection,
        metadata: item.metadata,
      };
      const buffer = WhitelistedAuctionManagerParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const arrayToObject = (array, keyField) =>
array.reduce((obj, item) => {
  obj[item[keyField]] = item;
  return obj;
}, {});


export const getPrizeTrackingTickets = async (name: string) => {
  try {
    const response: any = await axios.get(
      `http://localhost:3001/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/prizeTrackingTickets`,
    );
    
    let arr: any = [];
    response.data.map(item => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        price: item.price,
        collection: item.collection,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
        price: item.price,
        collection: item.collection,
      };
      const buffer = WhitelistedAuctionManagerParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};
