import {
  AuctionData,
  AuctionDataExtended,
  BidderMetadata,
  BidderPot,
} from '../models';
import { extendBorsh } from '../utils';
import { AUCTION_PROCESSOR } from './processAuctions';
extendBorsh();

const processAuctions = AUCTION_PROCESSOR.process;

describe('processAuctions', () => {
  const AUCTION = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          123, 241, 64, 204, 46, 77, 161, 62, 0, 16, 51, 52, 38, 40, 212, 235,
          255, 171, 248, 170, 122, 234, 55, 122, 223, 217, 190, 50, 69, 209,
          205, 136, 6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70,
          24, 192, 53, 218, 196, 57, 220, 26, 235, 59, 85, 152, 160, 240, 0, 0,
          0, 0, 1, 0, 1, 13, 235, 116, 97, 0, 0, 0, 0, 1, 128, 244, 3, 0, 0, 0,
          0, 0, 1, 16, 14, 0, 0, 0, 0, 0, 0, 1, 0, 163, 225, 17, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 4217760,
      owner: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
    },
    pubkey: '9bwkW9XHYaXazKmzVkcRuAXGRt27REWEcdRYYDeJQVYy',
  };

  const AUCTIONS_DATA_EXTENDED = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 2415120,
      owner: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
    },
    pubkey: '5QqdqErD2wB9AttDbn4pKJvoASF8emsqz2KKL7CiuBsK',
  };

  const BIDDER_POTS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          223, 42, 101, 235, 78, 51, 251, 235, 176, 200, 39, 96, 3, 78, 130,
          231, 193, 0, 164, 196, 66, 37, 107, 93, 227, 150, 114, 103, 58, 178,
          132, 93, 127, 97, 127, 175, 83, 30, 28, 18, 27, 73, 238, 125, 180,
          251, 101, 121, 200, 91, 72, 89, 76, 234, 73, 7, 194, 181, 65, 5, 21,
          221, 101, 133, 232, 201, 220, 84, 74, 57, 145, 125, 147, 149, 89, 77,
          211, 249, 224, 131, 222, 56, 35, 138, 89, 238, 92, 87, 220, 178, 246,
          238, 202, 236, 62, 39, 0,
        ]),
      ),
      executable: false,
      lamports: 1566000,
      owner: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
    },
    pubkey: 'GN2CivYLcfZUkFQAed91YAzwsYafRfirckEkNbiWEPdP',
  };

  const BIDDER_METADATAS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          58, 9, 79, 111, 164, 63, 57, 222, 155, 135, 25, 90, 97, 234, 214, 85,
          51, 131, 135, 116, 55, 29, 114, 45, 192, 149, 206, 136, 134, 125, 38,
          42, 88, 69, 50, 125, 143, 160, 2, 161, 243, 125, 230, 132, 204, 234,
          114, 177, 85, 18, 48, 10, 197, 254, 205, 249, 162, 153, 171, 228, 209,
          58, 65, 65, 0, 202, 154, 59, 0, 0, 0, 0, 91, 255, 77, 97, 0, 0, 0, 0,
          0,
        ]),
      ),
      executable: false,
      lamports: 1454640,
      owner: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
    },
    pubkey: '6EjxBbJDhtbV9D2Wps5dZ247nteYEaNE5TcUzUkvkhE2',
  };

  it('auctions', () => {
    expect(
      AUCTION_PROCESSOR.processors.auctions.is(AUCTION.account),
    ).toBeTruthy();
    expect(
      AUCTION_PROCESSOR.processors.auctions.is(AUCTIONS_DATA_EXTENDED.account),
    ).toBeTruthy();
    const obj = AUCTION_PROCESSOR.processors.auctions.process(AUCTION);
    expect(obj).toBeInstanceOf(AuctionData);
    expect(obj).toMatchObject({
      authority: '9LpWiPUDRyr9ZQLa9Y7qEkmTTMnSJNzEAgfs5CJMe3So',
      tokenMint: 'So11111111111111111111111111111111111111112',
      lastBid: undefined,
      priceFloor: {
        type: 1,
      },
      state: 1,
      bidState: { type: 0, bids: [] },
      _id: '9bwkW9XHYaXazKmzVkcRuAXGRt27REWEcdRYYDeJQVYy',
    });
  });

  it('auctions', () => {
    expect(
      AUCTION_PROCESSOR.processors.auctions.is(AUCTIONS_DATA_EXTENDED.account),
    ).toBeTruthy();
    expect(
      AUCTION_PROCESSOR.processors.auctions.is(AUCTIONS_DATA_EXTENDED.account),
    ).toBeTruthy();
    const obj = AUCTION_PROCESSOR.processors.auctionsDataExtended.process(
      AUCTIONS_DATA_EXTENDED,
    );
    expect(obj).toBeInstanceOf(AuctionDataExtended);
    expect(obj).toMatchObject({
      tickSize: undefined,
      gapTickSizePercentage: undefined,
      _id: '5QqdqErD2wB9AttDbn4pKJvoASF8emsqz2KKL7CiuBsK',
    });
  });

  it('bidderPots', () => {
    expect(
      AUCTION_PROCESSOR.processors.bidderPots.is(BIDDER_POTS.account),
    ).toBeTruthy();
    const obj = AUCTION_PROCESSOR.processors.bidderPots.process(BIDDER_POTS);
    expect(obj).toBeInstanceOf(BidderPot);
    expect(obj).toMatchObject({
      bidderPot: 'G29Qzjg13bNCQy8xHwrzbqETjhhCBPn3kUvot1Fng3bz',
      bidderAct: '9aF1MFpGRYq5L6TnKsdHAsRuu4LtmpaXNi7ek1asffgg',
      auctionAct: 'Gfi7XMmJ43rwSQk3AjbwXvVbG81H2T1ATAJRiDfKrBfU',
      emptied: 0,
      _id: 'GN2CivYLcfZUkFQAed91YAzwsYafRfirckEkNbiWEPdP',
    });
  });

  it('bidderMetadatas', () => {
    expect(
      AUCTION_PROCESSOR.processors.bidderMetadatas.is(BIDDER_METADATAS.account),
    ).toBeTruthy();
    const obj =
      AUCTION_PROCESSOR.processors.bidderMetadatas.process(BIDDER_METADATAS);
    expect(obj).toBeInstanceOf(BidderMetadata);
    expect(obj).toMatchObject({
      bidderPubkey: '4uYt59kVwNmWeuGnhjTQR8NY3Yhry6fTKCNaMswr3F3X',
      auctionPubkey: '6wa5Pw6HfeWZwgG7qpdZcnyK6k9mvW9CPdTY3poqHTRi',
      cancelled: 0,
      _id: '6EjxBbJDhtbV9D2Wps5dZ247nteYEaNE5TcUzUkvkhE2',
    });
  });

  describe('processAuctions', () => {
    it('auctions', async () => {
      let result: any;
      await processAuctions(AUCTION, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('auctions');
      expect(result.key).toBe('9bwkW9XHYaXazKmzVkcRuAXGRt27REWEcdRYYDeJQVYy');
      expect(result.value).toBeInstanceOf(AuctionData);

      expect(result.value).toMatchObject({
        authority: '9LpWiPUDRyr9ZQLa9Y7qEkmTTMnSJNzEAgfs5CJMe3So',
        tokenMint: 'So11111111111111111111111111111111111111112',
        lastBid: undefined,

        priceFloor: {
          type: 1,
        },
        state: 1,
        bidState: { type: 0, bids: [] },
        _id: '9bwkW9XHYaXazKmzVkcRuAXGRt27REWEcdRYYDeJQVYy',
      });
    });

    it('auctionsDataExtended', async () => {
      let result: any;
      await processAuctions(
        AUCTIONS_DATA_EXTENDED,
        async (prop, key, value) => {
          result = { prop, key, value };
        },
      );
      expect(result.prop).toBe('auctionsDataExtended');
      expect(result.key).toBe('5QqdqErD2wB9AttDbn4pKJvoASF8emsqz2KKL7CiuBsK');
      expect(result.value).toBeInstanceOf(AuctionDataExtended);
      expect(result.value).toMatchObject({
        tickSize: undefined,
        gapTickSizePercentage: undefined,
        _id: '5QqdqErD2wB9AttDbn4pKJvoASF8emsqz2KKL7CiuBsK',
      });
    });

    it('bidderPots', async () => {
      let result: any;
      await processAuctions(BIDDER_POTS, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('bidderPots');
      expect(result.key).toBe('GN2CivYLcfZUkFQAed91YAzwsYafRfirckEkNbiWEPdP');
      expect(result.value).toMatchObject({
        bidderPot: 'G29Qzjg13bNCQy8xHwrzbqETjhhCBPn3kUvot1Fng3bz',
        bidderAct: '9aF1MFpGRYq5L6TnKsdHAsRuu4LtmpaXNi7ek1asffgg',
        auctionAct: 'Gfi7XMmJ43rwSQk3AjbwXvVbG81H2T1ATAJRiDfKrBfU',
        emptied: 0,
        _id: 'GN2CivYLcfZUkFQAed91YAzwsYafRfirckEkNbiWEPdP',
      });
    });

    it('bidderMetadatas', async () => {
      let result: any;
      await processAuctions(BIDDER_METADATAS, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('bidderMetadatas');
      expect(result.key).toBe('6EjxBbJDhtbV9D2Wps5dZ247nteYEaNE5TcUzUkvkhE2');
      expect(result.value).toMatchObject({
        bidderPubkey: '4uYt59kVwNmWeuGnhjTQR8NY3Yhry6fTKCNaMswr3F3X',
        auctionPubkey: '6wa5Pw6HfeWZwgG7qpdZcnyK6k9mvW9CPdTY3poqHTRi',
        cancelled: 0,
        _id: '6EjxBbJDhtbV9D2Wps5dZ247nteYEaNE5TcUzUkvkhE2',
      });
    });
  });
});
