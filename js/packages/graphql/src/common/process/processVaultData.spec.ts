import { Vault, SafetyDepositBox } from '../../common';
import { extendBorsh } from '../utils';
import { VAULT_PROCESSOR as T } from './processVaultData';

const { processors: VAULT_PROCESSOR, process: processVaultData } = T;

extendBorsh();
describe('processVaultData', () => {
  const VAULT = {
    data: Buffer.from(
      new Uint8Array([
        3, 6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235,
        121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126,
        255, 0, 169, 71, 38, 131, 101, 207, 127, 177, 127, 163, 90, 68, 85, 157,
        200, 198, 20, 103, 37, 43, 146, 233, 17, 84, 167, 39, 236, 123, 161,
        167, 33, 225, 106, 43, 225, 226, 94, 43, 41, 135, 17, 55, 101, 64, 229,
        84, 100, 187, 16, 163, 77, 175, 4, 220, 86, 93, 173, 171, 21, 189, 218,
        39, 73, 94, 181, 134, 12, 78, 67, 40, 62, 206, 101, 158, 36, 175, 176,
        33, 74, 212, 134, 147, 84, 98, 218, 194, 148, 87, 102, 158, 223, 151,
        64, 36, 102, 29, 27, 144, 170, 240, 95, 87, 246, 76, 62, 187, 234, 115,
        107, 102, 39, 3, 191, 11, 141, 98, 56, 146, 28, 199, 88, 33, 214, 7,
        201, 127, 24, 150, 132, 1, 39, 155, 225, 118, 200, 122, 197, 34, 241,
        82, 167, 18, 255, 174, 17, 241, 1, 201, 251, 212, 32, 168, 46, 153, 113,
        134, 152, 249, 208, 164, 76, 133, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    ),
    executable: false,
    lamports: 2317680,
    owner: 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
  };
  const DEPOSITE_BOX = {
    data: Buffer.from(
      new Uint8Array([
        1, 109, 241, 68, 47, 171, 208, 91, 244, 76, 42, 107, 166, 221, 246, 88,
        68, 240, 44, 172, 175, 79, 200, 139, 102, 178, 85, 158, 14, 199, 95,
        172, 130, 13, 73, 30, 224, 170, 51, 160, 137, 146, 198, 119, 235, 124,
        191, 159, 119, 44, 240, 255, 237, 249, 82, 18, 81, 179, 0, 153, 197,
        244, 9, 195, 185, 153, 171, 162, 52, 180, 13, 54, 93, 71, 36, 115, 222,
        200, 117, 22, 245, 208, 55, 144, 235, 166, 38, 14, 117, 81, 164, 8, 127,
        242, 178, 132, 193, 0,
      ]),
    ),
    executable: false,
    lamports: 1572960,
    owner: 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
  };

  it('vaults', () => {
    const processor = VAULT_PROCESSOR.vaults;
    expect(processor.is(VAULT)).toBeTruthy();
    expect(processor.is(DEPOSITE_BOX)).toBeFalsy();
    const data = processor.process({
      account: VAULT,
      pubkey: '1',
    });
    expect(data).toBeInstanceOf(Vault);
    expect(data).toMatchObject({
      key: 3,
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      fractionMint: '5nk1TVN9Kq7p3mE7VYyAQNSb2kJKHSxgNm3zudCu6jjP',
      authority: '3xJJeFyP6vPNzSYfTA7JWBi6SoH6r6LomBkPPDnw6LSQ',
      fractionTreasury: 'A2GWrZqZfcrqDK54LHpc31BiEQGfUano3md1ik8923RU',
      redeemTreasury: 'AjitVQpESovwPD3TcCuHrRWaABbsUnine9kGTNpat3Rd',
      allowFurtherShareCreation: 1,
      pricingLookupAddress: '3fcmC4tnJq5xGLcjfi8zVziTF1oPy1aupjJpHUebTEH2',
      tokenTypeCount: 1,
      state: 2,
      _id: '1',
    });
  });

  it('safetyDepositBoxes', () => {
    const processor = VAULT_PROCESSOR.safetyDepositBoxes;
    expect(processor.is(DEPOSITE_BOX)).toBeTruthy();
    expect(processor.is(VAULT)).toBeFalsy();

    const data = processor.process({
      account: DEPOSITE_BOX,
      pubkey: '1',
    });
    expect(data).toBeInstanceOf(SafetyDepositBox);
    expect(data).toMatchObject({
      key: 1,
      vault: '8QApLqSHoHprCxFrg4XMtEv699Py7vsC3ejSebjdjcj3',
      tokenMint: 'tryAQgkFtrD6hNTj1xXbchcr8FUfqq4LRTcAPgaig7A',
      store: 'BLsAwaqSbinHTbJn2WurgdYK8g1LbEj9zaDUEBV8q3Jp',
      order: 0,
      _id: '1',
    });
  });

  describe('processVaultData', () => {
    it('safetyDepositBoxes', async () => {
      let result: any;
      const message = {
        account: DEPOSITE_BOX,
        pubkey: '1',
      };
      await processVaultData(message, async (prop, key, val) => {
        result = { prop, key, val };
      });
      expect(result.prop).toBe('safetyDepositBoxes');
      expect(result.key).toBe('1');
      expect(result.val).toMatchObject({
        key: 1,
        vault: '8QApLqSHoHprCxFrg4XMtEv699Py7vsC3ejSebjdjcj3',
        tokenMint: 'tryAQgkFtrD6hNTj1xXbchcr8FUfqq4LRTcAPgaig7A',
        store: 'BLsAwaqSbinHTbJn2WurgdYK8g1LbEj9zaDUEBV8q3Jp',
        order: 0,
        _id: '1',
      });
    });

    it('vaults', async () => {
      let result: any;
      const message = {
        account: VAULT,
        pubkey: '1',
      };
      await processVaultData(message, async (prop, key, val) => {
        result = { prop, key, val };
      });
      expect(result.prop).toBe('vaults');
      expect(result.key).toBe('1');
      expect(result.val).toMatchObject({
        key: 3,
        tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        fractionMint: '5nk1TVN9Kq7p3mE7VYyAQNSb2kJKHSxgNm3zudCu6jjP',
        authority: '3xJJeFyP6vPNzSYfTA7JWBi6SoH6r6LomBkPPDnw6LSQ',
        fractionTreasury: 'A2GWrZqZfcrqDK54LHpc31BiEQGfUano3md1ik8923RU',
        redeemTreasury: 'AjitVQpESovwPD3TcCuHrRWaABbsUnine9kGTNpat3Rd',
        allowFurtherShareCreation: 1,
        pricingLookupAddress: '3fcmC4tnJq5xGLcjfi8zVziTF1oPy1aupjJpHUebTEH2',
        tokenTypeCount: 1,
        state: 2,
        _id: '1',
      });
    });
  });
});
