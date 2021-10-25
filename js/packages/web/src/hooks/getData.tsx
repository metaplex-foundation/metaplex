import {
  AuctionDataExtendedParser,
  AuctionParser,
  BidderMetadataParser,
} from '@oyster/common';
import axios from 'axios';
import {
  BidderPotParser,
  PayoutTicket,
  WhitelistedAuctionManagerParser,
  WhitelistedBidRedemptionTicketParser,
  WhitelistedCreatorParser,
  WhitelistedEditionParser,
  WhitelistedMasterEditionVParser,
  WhitelistedMetadataParser,
  WhitelistedSafetyDepositConfigParser,
  WhitelistedSafetyDepositParser,
  WhitelistedVaultParser,
} from '../models/types';

export const DEFAULT_COLLECTION_FAMILY = 'Ninja';

export const getMetadatabyMint = async (mint: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?mint=${mint}`,
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getMetadatabyMint');
    console.log(err);
  }
};

export const getMetadataByMasterEdition = async (masterEdition: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?masterEdition=${masterEdition}`,
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getMetadataByMasterEdition');
    console.log(err);
  }
};

export const getMetdataByPubKey = async (pubKey: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?pubkey=${pubKey}`,
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
    console.log('getMetdataByPubKey');
    console.log(err);
  }
};

export const getMetdataByCreator = async (creator: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/metadata?creator=${creator}`,
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
    console.log('getMetdataByCreator');
    console.log(err);
  }
};

export const getMasterEditionsbyKey = async (edition: string, key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/${edition}?bubkey=${key}`,
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getMasterEditionsbyKey');
    console.log(err);
  }
};

export const getAuction = async (id: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctions?pubkey=${id}`,
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
      const buffer = AuctionParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getAuction');
    console.log(err);
  }
};

export const getCreator = async () => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/creators`,
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
    console.log('getCreator');
    console.log(err);
  }
};

export const getEditionsKey = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/editions?pubkey=${key}`,
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
    console.log('getEditions');
    console.log(err);
  }
};

export const getEditionsbyKey = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/editions?pubkey=${key}`,
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
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getEditions');
    console.log(err);
  }
};

export const getauctionManagersByKey = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctionManagers?auction=${key}`,
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
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getauctionManagersByKey');
    console.log(err);
  }
};

export const getCollection = async (name: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctionManagers?collection=${name}`,
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
    console.log('getCollection');
    console.log(err);
  }
};

export const getCollections = async () => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctionManagers`,
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
    console.log('getCollections');
    console.log(err);
  }
};

export const arrayToObject = (array, keyField) =>
  array?.reduce((obj, item) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});

export const getPrizeTrackingTicketsbyKey = async (name: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/prizeTrackingTickets?pubkey=${name}`,
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
        price: item.price,
        collection: item.collection,
      };
      const buffer = WhitelistedAuctionManagerParser(obj.pubkey, obj.account);
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getPrizeTrackingTickets');
    console.log(err);
  }
};

export const getAuctionDataExtendedByKey = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/auctionDataExtended?pubkey=${key}`,
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
      const buffer = AuctionDataExtendedParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getAuctionDataExtendedByKey');
    console.log(err);
  }
};

export const getVault = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/vaults?pubkey=${key}`,
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
      const buffer = WhitelistedVaultParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getVault');
    console.log(err);
  }
};

export const getGidRedemptionV2sByAuctionManagerAndWinningIndex = async (
  name: string,
  key: string,
) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${name}?pubkey=${key}`,
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
      const buffer = WhitelistedBidRedemptionTicketParser(
        obj.pubkey,
        obj.account,
      );
      arr.push(buffer);
    });

    return arrayToObject(arr, 'pubkey');
  } catch (err) {
    console.log('getGidRedemptionV2sByAuctionManagerAndWinningIndex');
    console.log(err);
  }
};

export const getGidRedemptionV2sbyKey = async (name: string, key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${name}?pubkey=${key}`,
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
      const buffer = WhitelistedBidRedemptionTicketParser(
        obj.pubkey,
        obj.account,
      );
      arr = buffer;
    });

    return arrayToObject(arr, 'pubkey');
  } catch (err) {
    console.log('getGidRedemptionV2sByAuctionManagerAndWinningIndex');
    console.log(err);
  }
};

export const getSafetyDepositBoxesByVaultAndIndexby = async (
  vault: string,
  index: string,
) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/safetyDepositBoxes?vault=${vault}&index=${index}`,
    );

    let arr: any = [];
    response.data.map(item => {
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
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/safetyDepositConfigs?auctionManager=${auctionManager}&index=${index}`,
    );

    let arr: any = [];
    response.data.map(item => {
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
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/bidRedemptionTicketsV2?auctionManager=${auctionManager}&index=${index}`,
    );

    let arr: any = [];
    response.data.map(item => {
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

export const getBidderMetadataByAuctionAndBidder = async (
  auction: string,
  bidder: string,
) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/bidderMetadata?auction=${auction}&bidder=${bidder}`,
    );

    let arr: any = [];
    response.data.map(item => {
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
      const buffer = BidderMetadataParser(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getBidderMetadataByAuctionAndBidder');
    console.log(err);
  }
};

export const getBidderMetadata = async () => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/bidderMetadata`,
    );

    let arr: any = [];
    response.data.map(item => {
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
      const buffer = BidderMetadataParser(obj.pubkey, obj.account);
      arr.push(buffer);
    });
    return arrayToObject(arr, 'pubkey');

    return arr;
  } catch (err) {
    console.log('getBidderMetadataByAuctionAndBidder');
    console.log(err);
  }
};

export const getBidderPotsByAuctionAndBidder = async (
  auction: string,
  bidder: string,
) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/${process.env.NEXT_PUBLIC_STORE_ADDRESS}/bidderPots?auction=${auction}&bidder=${bidder}`,
    );

    let arr: any = [];

    response.data.map(item => {
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
      const buffer = BidderPotParser(obj.pubkey, obj.account);
      arr = buffer;
    });
    return arr;
  } catch (err) {
    console.log('getBidderPotsByAuctionAndBidder');
    console.log(err);
  }
};

export const getPayoutTickets = async (key: string) => {
  try {
    const response: any = await axios.get(
      `${process.env.NEXT_PUBLIC_HOST_ADDRESS}/api/payoutTickets?pubkey=${key}`,
    );

    let arr: any = [];

    response.data.map(item => {
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
      const buffer = PayoutTicket(obj.pubkey, obj.account);
      arr = buffer;
    });

    return arr;
  } catch (err) {
    console.log('getBidderPotsByAuctionAndBidder');
    console.log(err);
  }
};
