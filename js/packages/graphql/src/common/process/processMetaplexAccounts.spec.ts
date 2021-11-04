import {
  AuctionManagerV2,
  PayoutTicket,
  SafetyDepositConfig,
  Store,
  WhitelistedCreator,
  BidRedemptionTicketV2,
  PrizeTrackingTicket,
} from '../models';
import { METAPLEX_ACCOUNTS_PROCESSOR } from './processMetaplexAccounts';
import { extendBorsh } from '../utils';
extendBorsh();
const P = METAPLEX_ACCOUNTS_PROCESSOR.processors;
const processMetaplexAccounts = METAPLEX_ACCOUNTS_PROCESSOR.process;

describe('processMetaplexAccounts', () => {
  const CREATORS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          4, 222, 99, 207, 91, 100, 212, 192, 126, 5, 17, 23, 101, 246, 130,
          148, 114, 198, 167, 32, 129, 152, 89, 10, 58, 215, 5, 76, 165, 120,
          128, 150, 153, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 1197120,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },

    pubkey: '2LVwXdhXvSjCh6GnZRXbr4PQCgYY6hvqu81yQ4t6KJXj',
  };

  const AUCTIONS_MANAGERS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          10, 50, 16, 84, 92, 115, 147, 207, 82, 165, 31, 148, 116, 27, 11, 123,
          56, 115, 62, 165, 237, 235, 50, 182, 144, 244, 14, 87, 205, 105, 183,
          190, 7, 187, 123, 2, 51, 249, 9, 176, 69, 61, 137, 253, 76, 217, 151,
          176, 199, 235, 72, 189, 23, 11, 179, 101, 131, 51, 113, 26, 184, 182,
          205, 62, 189, 47, 84, 93, 242, 189, 180, 88, 0, 146, 226, 148, 162,
          224, 152, 90, 36, 181, 29, 209, 209, 149, 133, 245, 195, 207, 213,
          126, 150, 85, 15, 26, 82, 68, 117, 178, 34, 44, 159, 211, 90, 21, 0,
          168, 86, 145, 130, 0, 221, 209, 225, 86, 27, 120, 150, 207, 27, 31,
          137, 122, 190, 137, 194, 99, 215, 38, 212, 34, 237, 108, 233, 160, 76,
          41, 235, 146, 25, 50, 105, 51, 82, 253, 221, 49, 92, 219, 12, 175, 30,
          166, 0, 248, 135, 62, 153, 117, 22, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 3473040,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: 'CTSq1P4kNw7ZpAGhgUUTkmu49zgQWzqKUNpkfJXd335',
  };

  const STORES = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          3, 0, 8, 175, 169, 191, 10, 132, 153, 239, 245, 177, 12, 199, 221, 36,
          59, 224, 20, 103, 70, 219, 249, 150, 85, 157, 145, 130, 193, 93, 188,
          24, 246, 87, 13, 186, 28, 52, 26, 119, 115, 94, 210, 96, 195, 36, 182,
          190, 250, 187, 9, 244, 245, 52, 7, 50, 47, 49, 172, 28, 41, 212, 233,
          209, 175, 49, 11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127,
          107, 4, 195, 205, 88, 184, 108, 115, 26, 160, 253, 181, 73, 182, 209,
          188, 3, 248, 41, 70, 6, 221, 246, 225, 215, 101, 161, 147, 217, 203,
          225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58,
          140, 245, 133, 126, 255, 0, 169, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 2491680,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: 'AzzC7t3QKC4dt3vfYk5c41D7Mu3sXQtoyzzAvSpPSeC2',
  };

  const PAYOUT_TICKETS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          5, 140, 95, 0, 13, 100, 112, 203, 158, 125, 244, 110, 189, 48, 173,
          149, 83, 229, 48, 191, 188, 57, 3, 29, 149, 93, 43, 86, 47, 190, 46,
          231, 93, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 1176240,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: 'DFR4sQFcQwZdy2wC8Yj4D7yQ9dVhyoNsPhNdWLbgt1cK',
  };

  const SAFETY_DEPOSIT_CONFIGS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          9, 145, 140, 29, 179, 16, 247, 80, 89, 178, 65, 86, 88, 251, 148, 32,
          16, 135, 125, 73, 82, 180, 89, 63, 1, 248, 98, 225, 106, 86, 28, 91,
          41, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 0, 0, 0, 1, 12, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),

      executable: false,
      lamports: 1524240,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: '6RJF37TpcAiFaBmUZn1CQizg5eU5kFVicoRgYQgnmk7G',
  };

  const BID_REDEMPTIONS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 192, 163, 157, 47, 215, 88, 226, 250,
          251, 170, 17, 167, 240, 83, 220, 227, 245, 113, 177, 229, 154, 15,
          200, 121, 84, 163, 243, 226, 239, 192, 118, 249, 128,
        ]),
      ),

      executable: false,
      lamports: 1190160,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: '6oE17ad2Wv2qjqZE6EJmJuFzLvJ3muR5YAXzW9QEHWau',
  };

  const PRIZE_TRACKING_TICKETS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          8, 2, 248, 232, 186, 0, 40, 216, 115, 18, 98, 220, 153, 196, 54, 123,
          98, 248, 157, 22, 75, 97, 14, 20, 104, 57, 93, 211, 151, 72, 222, 4,
          109, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0,
        ]),
      ),

      executable: false,
      lamports: 1635600,
      owner: 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
    },
    pubkey: 'H3WJmyQ9J6QKDe3N9wbwqttWTEgp6fuw2BcSTdkuB8wi',
  };

  it('creators', () => {
    expect(P.creators.is(CREATORS.account)).toBeTruthy();
    expect(P.creators.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.creators.is(STORES.account)).toBeFalsy();
    expect(P.creators.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(P.creators.is(SAFETY_DEPOSIT_CONFIGS.account)).toBeFalsy();
    expect(P.creators.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(P.creators.is(PRIZE_TRACKING_TICKETS.account)).toBeFalsy();

    const obj = P.creators.process(CREATORS);
    expect(obj).toBeInstanceOf(WhitelistedCreator);
    expect(obj).toMatchObject({
      key: 4,
      address: 'Fy7nKWE7Tm1kjLp1Rfr29nHAsDCLevHxzgQPBasuCFYc',
      activated: true,
      _id: '2LVwXdhXvSjCh6GnZRXbr4PQCgYY6hvqu81yQ4t6KJXj',
    });
  });

  it('auctionManagers', () => {
    expect(P.auctionManagers.is(CREATORS.account)).toBeFalsy();
    expect(P.auctionManagers.is(AUCTIONS_MANAGERS.account)).toBeTruthy();
    expect(P.auctionManagers.is(STORES.account)).toBeFalsy();
    expect(P.auctionManagers.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(P.auctionManagers.is(SAFETY_DEPOSIT_CONFIGS.account)).toBeFalsy();
    expect(P.auctionManagers.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(P.auctionManagers.is(PRIZE_TRACKING_TICKETS.account)).toBeFalsy();

    const obj = P.auctionManagers.process(AUCTIONS_MANAGERS);

    expect(obj).toBeInstanceOf(AuctionManagerV2);
    expect(obj).toMatchObject({
      key: 10,
      store: '4NRpxPz7V2ewhACfM65m7MUzXcuWSTBBfKnQMA7pszAz',
      authority: 'Dcr2gGo68FGkETjHiByu2LzzsxaxT2Mw9AtfKLpVa23W',
      auction: '4Bkn2ksHY6vfHcqPPqLpoXFmDH2ZAhDWsYJ1NUjsevR7',
      vault: '5cEpE6zHMmyfLSqZ91qyJ3sGd6JQVuSNqyxhDfWEGr6A',
      acceptPayment: '3ca7D8U6RY9oCLaxLovW7XJXjMngUmZL4zASXFipnTdo',
      state: {
        status: 3,
        hasParticipation: 0,
      },
      _id: 'CTSq1P4kNw7ZpAGhgUUTkmu49zgQWzqKUNpkfJXd335',
    });
  });

  it('stores', () => {
    expect(P.stores.is(CREATORS.account)).toBeFalsy();
    expect(P.stores.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.stores.is(STORES.account)).toBeTruthy();
    expect(P.stores.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(P.stores.is(SAFETY_DEPOSIT_CONFIGS.account)).toBeFalsy();
    expect(P.stores.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(P.stores.is(PRIZE_TRACKING_TICKETS.account)).toBeFalsy();

    const obj = P.stores.process(STORES);
    expect(obj).toBeInstanceOf(Store);
    expect(obj).toMatchObject({
      key: 3,
      public: true,
      auctionProgram: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
      tokenVaultProgram: 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
      tokenMetadataProgram: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      creatorIds: [],
      _id: 'AzzC7t3QKC4dt3vfYk5c41D7Mu3sXQtoyzzAvSpPSeC2',
    });
  });

  it('payoutTickets', () => {
    expect(P.payoutTickets.is(CREATORS.account)).toBeFalsy();
    expect(P.payoutTickets.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.payoutTickets.is(STORES.account)).toBeFalsy();
    expect(P.payoutTickets.is(PAYOUT_TICKETS.account)).toBeTruthy();
    expect(P.payoutTickets.is(SAFETY_DEPOSIT_CONFIGS.account)).toBeFalsy();
    expect(P.payoutTickets.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(P.payoutTickets.is(PRIZE_TRACKING_TICKETS.account)).toBeFalsy();

    const obj = P.payoutTickets.process(PAYOUT_TICKETS);

    expect(obj).toBeInstanceOf(PayoutTicket);
    expect(obj).toMatchObject({
      key: 5,
      recipient: 'ASx6b7ptFRqh8KebrvnGhhRBxzJWwuSzP9shTSeiBdbS',

      _id: 'DFR4sQFcQwZdy2wC8Yj4D7yQ9dVhyoNsPhNdWLbgt1cK',
    });
  });

  it('safetyDepositConfigs', () => {
    expect(P.safetyDepositConfigs.is(CREATORS.account)).toBeFalsy();
    expect(P.safetyDepositConfigs.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.safetyDepositConfigs.is(STORES.account)).toBeFalsy();
    expect(P.safetyDepositConfigs.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(
      P.safetyDepositConfigs.is(SAFETY_DEPOSIT_CONFIGS.account),
    ).toBeTruthy();
    expect(P.safetyDepositConfigs.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(
      P.safetyDepositConfigs.is(PRIZE_TRACKING_TICKETS.account),
    ).toBeFalsy();
    const obj = P.safetyDepositConfigs.process(SAFETY_DEPOSIT_CONFIGS);

    expect(obj).toBeInstanceOf(SafetyDepositConfig);
    expect(obj).toMatchObject({
      key: 9,
      auctionManager: 'AoA34P9uGk2Jk69MgauR32RgkewAyjCawTQdG35v7oqJ',

      winningConfigType: 3,
      amountType: 1,
      lengthType: 1,
      amountRanges: [{}],
      participationConfig: null,
      participationState: null,
      _id: '6RJF37TpcAiFaBmUZn1CQizg5eU5kFVicoRgYQgnmk7G',
    });
  });

  it('bidRedemptions', () => {
    expect(P.bidRedemptions.is(CREATORS.account)).toBeFalsy();
    expect(P.bidRedemptions.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.bidRedemptions.is(STORES.account)).toBeFalsy();
    expect(P.bidRedemptions.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(P.bidRedemptions.is(SAFETY_DEPOSIT_CONFIGS.account)).toBeFalsy();
    expect(P.bidRedemptions.is(BID_REDEMPTIONS.account)).toBeTruthy();
    expect(P.bidRedemptions.is(PRIZE_TRACKING_TICKETS.account)).toBeFalsy();
    const obj = P.bidRedemptions.process(BID_REDEMPTIONS);

    expect(obj).toBeInstanceOf(BidRedemptionTicketV2);
    expect(obj).toMatchObject({
      key: 11,
      data: [
        11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 192, 163, 157, 47, 215, 88, 226, 250,
        251, 170, 17, 167, 240, 83, 220, 227, 245, 113, 177, 229, 154, 15, 200,
        121, 84, 163, 243, 226, 239, 192, 118, 249, 128,
      ],
      _id: '6oE17ad2Wv2qjqZE6EJmJuFzLvJ3muR5YAXzW9QEHWau',
      auctionManager: 'DxyynTis2xS3k6xngvuVKY1atY1rPBK4VbM6WeKcHGKS',
    });
  });

  it('prizeTrackingTickets', () => {
    expect(P.prizeTrackingTickets.is(CREATORS.account)).toBeFalsy();
    expect(P.prizeTrackingTickets.is(AUCTIONS_MANAGERS.account)).toBeFalsy();
    expect(P.prizeTrackingTickets.is(STORES.account)).toBeFalsy();
    expect(P.prizeTrackingTickets.is(PAYOUT_TICKETS.account)).toBeFalsy();
    expect(
      P.prizeTrackingTickets.is(SAFETY_DEPOSIT_CONFIGS.account),
    ).toBeFalsy();
    expect(P.prizeTrackingTickets.is(BID_REDEMPTIONS.account)).toBeFalsy();
    expect(
      P.prizeTrackingTickets.is(PRIZE_TRACKING_TICKETS.account),
    ).toBeTruthy();
    const obj = P.prizeTrackingTickets.process(PRIZE_TRACKING_TICKETS);

    expect(obj).toBeInstanceOf(PrizeTrackingTicket);
    expect(obj).toMatchObject({
      key: 8,
      metadata: 'CbxD3K5XfrcrRekYiHG4vsQJdvuuVy8aBXjUfxH4TqE',
      _id: 'H3WJmyQ9J6QKDe3N9wbwqttWTEgp6fuw2BcSTdkuB8wi',
    });
  });

  describe('processMetaplexAccounts', () => {
    it('creators', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(CREATORS, async (prop, key, value) => {
        result = { prop, key };
        obj = value;
      });
      expect(result.prop).toBe('creators');
      expect(result.key).toBe('2LVwXdhXvSjCh6GnZRXbr4PQCgYY6hvqu81yQ4t6KJXj');

      expect(obj).toBeInstanceOf(WhitelistedCreator);
      expect(obj).toMatchObject({
        key: 4,
        address: 'Fy7nKWE7Tm1kjLp1Rfr29nHAsDCLevHxzgQPBasuCFYc',
        activated: true,
        _id: '2LVwXdhXvSjCh6GnZRXbr4PQCgYY6hvqu81yQ4t6KJXj',
      });
    });

    it('auctionManagers', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(
        AUCTIONS_MANAGERS,
        async (prop, key, value) => {
          result = { prop, key };
          obj = value;
        },
      );
      expect(result.prop).toBe('auctionManagers');
      expect(result.key).toBe('CTSq1P4kNw7ZpAGhgUUTkmu49zgQWzqKUNpkfJXd335');

      expect(obj).toBeInstanceOf(AuctionManagerV2);
      expect(obj).toMatchObject({
        key: 10,
        store: '4NRpxPz7V2ewhACfM65m7MUzXcuWSTBBfKnQMA7pszAz',
        authority: 'Dcr2gGo68FGkETjHiByu2LzzsxaxT2Mw9AtfKLpVa23W',
        auction: '4Bkn2ksHY6vfHcqPPqLpoXFmDH2ZAhDWsYJ1NUjsevR7',
        vault: '5cEpE6zHMmyfLSqZ91qyJ3sGd6JQVuSNqyxhDfWEGr6A',
        acceptPayment: '3ca7D8U6RY9oCLaxLovW7XJXjMngUmZL4zASXFipnTdo',
        state: {
          status: 3,
          hasParticipation: 0,
        },
        _id: 'CTSq1P4kNw7ZpAGhgUUTkmu49zgQWzqKUNpkfJXd335',
      });
    });

    it('stores', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(STORES, async (prop, key, value) => {
        result = { prop, key };
        obj = value;
      });
      expect(result.prop).toBe('stores');
      expect(result.key).toBe('AzzC7t3QKC4dt3vfYk5c41D7Mu3sXQtoyzzAvSpPSeC2');

      expect(obj).toBeInstanceOf(Store);
      expect(obj).toMatchObject({
        key: 3,
        public: true,
        auctionProgram: 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
        tokenVaultProgram: 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
        tokenMetadataProgram: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        creatorIds: [],
        _id: 'AzzC7t3QKC4dt3vfYk5c41D7Mu3sXQtoyzzAvSpPSeC2',
      });
    });

    it('payoutTickets', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(
        PAYOUT_TICKETS,
        async (prop, key, value) => {
          result = { prop, key };
          obj = value;
        },
      );
      expect(result.prop).toBe('payoutTickets');
      expect(result.key).toBe('DFR4sQFcQwZdy2wC8Yj4D7yQ9dVhyoNsPhNdWLbgt1cK');

      expect(obj).toBeInstanceOf(PayoutTicket);
      expect(obj).toMatchObject({
        key: 5,
        recipient: 'ASx6b7ptFRqh8KebrvnGhhRBxzJWwuSzP9shTSeiBdbS',

        _id: 'DFR4sQFcQwZdy2wC8Yj4D7yQ9dVhyoNsPhNdWLbgt1cK',
      });
    });

    it('safetyDepositConfigs', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(
        SAFETY_DEPOSIT_CONFIGS,
        async (prop, key, value) => {
          result = { prop, key };
          obj = value;
        },
      );
      expect(result.prop).toBe('safetyDepositConfigs');
      expect(result.key).toBe('6RJF37TpcAiFaBmUZn1CQizg5eU5kFVicoRgYQgnmk7G');

      expect(obj).toBeInstanceOf(SafetyDepositConfig);
      expect(obj).toMatchObject({
        key: 9,
        auctionManager: 'AoA34P9uGk2Jk69MgauR32RgkewAyjCawTQdG35v7oqJ',

        winningConfigType: 3,
        amountType: 1,
        lengthType: 1,
        amountRanges: [{}],
        participationConfig: null,
        participationState: null,
        _id: '6RJF37TpcAiFaBmUZn1CQizg5eU5kFVicoRgYQgnmk7G',
      });
    });

    it('bidRedemptions', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(
        BID_REDEMPTIONS,
        async (prop, key, value) => {
          result = { prop, key };
          obj = value;
        },
      );
      expect(result.prop).toBe('bidRedemptions');
      expect(result.key).toBe('6oE17ad2Wv2qjqZE6EJmJuFzLvJ3muR5YAXzW9QEHWau');

      expect(obj).toBeInstanceOf(BidRedemptionTicketV2);
      expect(obj).toMatchObject({
        key: 11,
        data: [
          11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 192, 163, 157, 47, 215, 88, 226, 250,
          251, 170, 17, 167, 240, 83, 220, 227, 245, 113, 177, 229, 154, 15,
          200, 121, 84, 163, 243, 226, 239, 192, 118, 249, 128,
        ],
        _id: '6oE17ad2Wv2qjqZE6EJmJuFzLvJ3muR5YAXzW9QEHWau',
        auctionManager: 'DxyynTis2xS3k6xngvuVKY1atY1rPBK4VbM6WeKcHGKS',
      });
    });

    it('prizeTrackingTickets', async () => {
      let result: any;
      let obj: any;
      await processMetaplexAccounts(
        PRIZE_TRACKING_TICKETS,
        async (prop, key, value) => {
          result = { prop, key };
          obj = value;
        },
      );
      expect(result.prop).toBe('prizeTrackingTickets');
      expect(result.key).toBe('H3WJmyQ9J6QKDe3N9wbwqttWTEgp6fuw2BcSTdkuB8wi');

      expect(obj).toBeInstanceOf(PrizeTrackingTicket);
      expect(obj).toMatchObject({
        key: 8,
        metadata: 'CbxD3K5XfrcrRekYiHG4vsQJdvuuVy8aBXjUfxH4TqE',
        _id: 'H3WJmyQ9J6QKDe3N9wbwqttWTEgp6fuw2BcSTdkuB8wi',
      });
    });
  });
});
