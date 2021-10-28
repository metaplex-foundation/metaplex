import axios from 'axios';
import {
  AuctionDataExtendedParser,
  AuctionParser,
  WhitelistedAuctionManagerParser,
  WhitelistedBidRedemptionTicketParser,
  WhitelistedMasterEditionVParser,
  WhitelistedMetadataParser,
  WhitelistedSafetyDepositConfigParser,
  WhitelistedSafetyDepositParser,
  WhitelistedVaultParser,
} from '../models/types';

const API_URL = 'https://167.172.2.250/api/';
const STORE = process.env.NEXT_PUBLIC_STORE_ADDRESS;

export const getMetadatabyMint = async (mint: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/metadata?mint=${mint}`,
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
      `${API_URL}${STORE}/metadata?masterEdition=${masterEdition}`,
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
    if (key == undefined || key == '') return [];
    const response: any = await axios.get(
      `${API_URL}${STORE}/${edition}?pubkey=${key}`,
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

export const getAuctionDataExtendedByKey = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/auctionDataExtended?pubkey=${key}`,
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
      const buffer = AuctionDataExtendedParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getAuctionDataExtendedByKey');
    console.log(err);
  }
};

export const getAuction = async (id: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/auctions?pubkey=${id}`,
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
      const buffer = AuctionParser(obj.pubkey, obj.account);
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getAuction');
    console.log(err);
  }
};

export const getVault = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/vaults?pubkey=${key}`,
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
      const buffer = WhitelistedVaultParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getVault');
    console.log(err);
  }
};

export const arrayToObject = (array: any, keyField: string) =>
  array?.reduce((obj: any, item: any) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});

export const getAuctionDataExtended = async () => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/auctionDataExtended`,
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
      const buffer = AuctionDataExtendedParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });

    return arrayToObject(arr, 'pubkey');
  } catch (err) {
    console.log('getAuctionDataExtendedByKey');
    console.log(err);
  }
};

export const getMasterEditionsbyMint = async (edition: string, key: string) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/${edition}?mint=${key}`,
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

export const getMetadata = async () => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/metadata`,
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
      arr.push(buffer);
    });
    return arrayToObject(arr, 'pubkey');
  } catch (err) {
    console.log('err');
    console.log(err);
  }
};

export const getSafetyDepositBoxesByVaultAndIndexby = async (
  vault: string,
  index: string,
) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/safetyDepositBoxes?vault=${vault}&index=${index}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        order: item.order,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedSafetyDepositParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getSafetyDepositBoxesByVaultAndIndex');
    console.log(err);
  }
};

export const getSafetyDepositConfigsByAuctionManagerAndIndexby = async (
  auctionManager: string,
  index: string,
) => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/safetyDepositConfigs?auctionManager=${auctionManager}&index=${index}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        order: item.order,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedSafetyDepositConfigParser(
        obj.pubkey,
        obj.account,
      );
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getSafetyDepositBoxesByVaultAndIndex');
    console.log(err);
  }
};

export const getBidRedemptionV2sByAuctionManagerAndWinningIndexby = async (
  auctionManager: string,
  index: string,
) => {
  try {
    const response: any = await axios.get(
      `${API_URL}bidRedemptionTicketsV2?auctionManager=${auctionManager}&index=${index}`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
      const account = {
        data: Buffer.from(item.account.data, 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        owner: item.account.owner,
        order: item.order,
      };

      const obj = {
        account: account,
        pubkey: item.pubkey,
      };
      const buffer = WhitelistedBidRedemptionTicketParser(
        obj.pubkey,
        obj.account,
      );
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getSafetyDepositBoxesByVaultAndIndex');
    console.log(err);
  }
};

export const getCollections = async () => {
  try {
    const response: any = await axios.get(
      `${API_URL}${STORE}/auctionManagers`,
    );

    let arr: any = [];
    response.data.map((item: any) => {
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
    console.log('getCollections');
    console.log(err);
  }
};
