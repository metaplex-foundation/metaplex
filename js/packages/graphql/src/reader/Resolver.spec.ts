import { BN } from 'bn.js';
import { Edition, MasterEditionV2, Metadata, MetadataKey } from '../common';
import { IReader } from './Reader';
import { Resolver } from './Resolver';

describe('MetaplexService', () => {
  describe('art', () => {
    async function getEdition() {
      const item = new Edition({
        key: MetadataKey.EditionV1,
        parent: '1',
        edition: new BN(1),
      });
      return item;
    }
    async function getMasterEdition() {
      return new MasterEditionV2({
        supply: new BN(1),
        maxSupply: new BN(2),
      });
    }
    function setup(api?: Partial<IReader>) {
      return new Resolver({
        getEdition,
        getMasterEdition,
        ...api,
      } as IReader);
    }
    describe('artType', () => {
      it('should give 1', async () => {
        const srv = setup();
        const artwork = new Metadata();
        artwork.edition = 'test';
        const result = await srv.artType(artwork);
        expect(result).toBe(1);
      });

      it('should give 0', async () => {
        const srv = setup({
          async getMasterEdition(id) {
            if (id === '1') {
              return null;
            }
            return getMasterEdition();
          },
        });
        const artwork = new Metadata();
        artwork.edition = 'test';
        artwork.masterEdition = 'masterEdition';
        const result = await srv.artType(artwork);
        expect(result).toBe(0);
      });

      it('should give 2', async () => {
        const srv = setup({
          async getEdition() {
            return null;
          },
          async getMasterEdition() {
            return null;
          },
        });
        const artwork = new Metadata();
        const result = await srv.artType(artwork);
        expect(result).toBe(2);
      });
    });

    describe('artEditionNumber', () => {
      it('should give result', async () => {
        const edition = new BN(1);
        const srv = setup({
          async getEdition() {
            const item = new Edition({
              key: MetadataKey.EditionV1,
              parent: '1',
              edition,
            });
            return item;
          },
        });
        const artwork = new Metadata();
        artwork.edition = 'test';
        const result = await srv.artEditionNumber(artwork);
        expect(result).toBe(edition);
      });
      it("should give null because of masterEdition doesn't exist", async () => {
        const edition = new BN(1);
        const srv = setup({
          async getMasterEdition() {
            return null;
          },
          async getEdition() {
            const item = new Edition({
              key: MetadataKey.EditionV1,
              parent: '1',
              edition,
            });
            return item;
          },
        });
        const artwork = new Metadata();
        const result = await srv.artEditionNumber(artwork);
        expect(result).toBe(undefined);
      });

      it('should give null because of edition missing', async () => {
        const srv = setup({
          async getEdition() {
            return null;
          },
        });
        const artwork = new Metadata();
        const result = await srv.artEditionNumber(artwork);
        expect(result).toBe(undefined);
      });
    });

    describe('artSupply', () => {
      const edition1 = new MasterEditionV2({
        supply: new BN(1),
      });

      const edition2 = new MasterEditionV2({
        supply: new BN(2),
      });

      async function getMasterEditionCustom(id?: string) {
        if (id === '1') {
          return edition1;
        }
        if (id === 'masterEdition') {
          return edition2;
        }
        return null;
      }

      it('meEdition && masterEdition exists', async () => {
        const artwork = new Metadata();
        artwork.edition = 'edition';
        artwork.masterEdition = 'masterEdition';
        const srv = setup({
          getMasterEdition: getMasterEditionCustom,
        });
        const result = await srv.artSupply(artwork);
        expect(result).toBe(edition1.supply);
      });

      it('test2', async () => {
        const artwork = new Metadata();
        artwork.edition = 'edition';

        const srv = setup({
          getMasterEdition: getMasterEditionCustom,
        });
        const result = await srv.artSupply(artwork);
        expect(result).toBe(edition1.supply);
      });

      it('test3', async () => {
        const artwork = new Metadata();
        artwork.masterEdition = 'masterEdition';
        const srv = setup({
          getMasterEdition: getMasterEditionCustom,
        });
        const result = await srv.artSupply(artwork);
        expect(result).toBe(edition2.supply);
      });

      it('null', async () => {
        const artwork = new Metadata();
        const srv = setup({
          getMasterEdition: getMasterEditionCustom,
        });
        const result = await srv.artSupply(artwork);
        expect(result).toBe(undefined);
      });
    });

    it('artMaxSupply', async () => {
      const srv = setup();
      const artwork = new Metadata();
      artwork.masterEdition = '1';
      const result = await srv.artMaxSupply(artwork);
      expect(result?.toNumber()).toBe(2);
    });
  });

  // describe("getSafetyDepositBoxesExpected", () => {
  //   it("manager1", async () => {
  //     const api = {
  //       async getVault() {
  //         const vault = new Vault();
  //         vault.tokenTypeCount = 1000;
  //         return vault;
  //       },
  //     } as Reader;
  //     const srv = new Resolver(api);
  //     const state = new AuctionManagerStateV1();
  //     state.winningConfigItemsValidated = 999;
  //     const result = await srv.getSafetyDepositBoxesExpected({
  //       vault: "123",
  //       key: MetaplexKey.AuctionManagerV1,
  //       state: state,
  //     });
  //     expect(result?.toNumber()).toBe(999);
  //   });
  //   it("manager2", async () => {
  //     const api = {
  //       async getVault() {
  //         const vault = new Vault();
  //         vault.tokenTypeCount = 1000;
  //         return vault;
  //       },
  //     } as Reader;
  //     const srv = new Resolver(api);
  //     const state = new AuctionManagerStateV1();
  //     state.winningConfigItemsValidated = 999;
  //     const result = await srv.getSafetyDepositBoxesExpected({
  //       vault: "123",
  //       key: MetaplexKey.AuctionManagerV2,
  //       state,
  //     });
  //     expect(result?.toNumber()).toBe(1000);
  //   });
  // });
});
