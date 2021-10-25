import axios from 'axios';
import {
  WhitelistedMasterEditionVParser,
  WhitelistedMetadataParser,
} from '../models/types';

const API_URL = process.env.NEXT_PUBLIC_HOST_ADDRESS + '/api/';

export const getMetadatabyMint = async (mint: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?mint=${mint}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getMetadataByMasterEdition = async (masterEdition: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?masterEdition=${masterEdition}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getMasterEditionsbyKey = async (edition: string, key: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${process.env.NEXT_PUBLIC_STORE_ADDRESS}/${edition}?pubkey=${key}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getMasterEditionsbyKey');
    console.log(err);
  }
};

export const getMasterEditionsbyMint = async (edition: string, key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/${edition}?mint=${key}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getMasterEditionsbyKey');
    console.log(err);
  }
};
