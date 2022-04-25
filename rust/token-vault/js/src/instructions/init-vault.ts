import {
  AccountLayout as TokenAccountLayout,
  AuthorityType,
  createSetAuthorityInstruction,
  MintLayout,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { VAULT_PROGRAM_ID } from '../common/consts';
import { createMint, createTokenAccount, pdaForVault } from '../common/helpers';
import {
  createInitVaultInstruction,
  InitVaultInstructionAccounts,
  InitVaultInstructionArgs,
  Vault,
} from '../generated';
import { strict as assert } from 'assert';

type HasFractionMint = VaultSetup & {
  fractionMint: PublicKey;
  fractionMintAuthority: PublicKey;
};
type HasFractionTreasury = VaultSetup & {
  fractionTreasury: PublicKey;
};
type HasRedeemTreasury = VaultSetup & {
  redeemTreasury: PublicKey;
};
/**
 * A {@link VaultSetup} that has been completed, meaning all necessary accounts
 * were either provided or have been created and initialized.
 *
 * @category InitVault
 * @category Instructions
 */
export type CompletedVaultSetup = VaultSetup &
  HasFractionMint &
  HasFractionTreasury &
  HasRedeemTreasury;

/**
 * Sets up the accounts needed to conform to the conditions outlined in
 * {@link initVault} in order to initialize a vault with them.
 * Use these method if you don't have those accounts setup already.
 *
 * See {@link InitVaultInstructionAccounts} for more information about those accounts.
 * @param args
 * @param args.externalPriceAccount should be created via {@link createExternalPriceAccount}
 *
 * @category InitVault
 * @category Instructions
 */
export class VaultSetup {
  readonly instructions: TransactionInstruction[] = [];
  readonly signers: Signer[] = [];

  fractionMint?: PublicKey;
  fractionTreasury?: PublicKey;
  redeemTreasury?: PublicKey;
  fractionMintAuthority?: PublicKey;

  private constructor(
    private readonly connection: Connection,
    readonly vaultPda: PublicKey,
    readonly vaultPair: Keypair,
    readonly vaultAuthority: PublicKey,
    readonly priceMint: PublicKey,
    readonly externalPriceAccount: PublicKey,
  ) {}

  /**
   * Creates an {@link VaultSetup} which exposes methods to setup the necessary
   * accounts to initialize a vault.
   */
  static async create(
    connection: Connection,
    {
      vaultAuthority,
      priceMint,
      externalPriceAccount,
    }: {
      vaultAuthority: PublicKey;
      priceMint: PublicKey;
      externalPriceAccount: PublicKey;
    },
  ) {
    const { vaultPair, vaultPda } = await vaultAccountPDA();

    return new VaultSetup(
      connection,
      vaultPda,
      vaultPair,
      vaultAuthority,
      priceMint,
      externalPriceAccount,
    );
  }

  // -----------------
  // Fraction Mint
  // -----------------
  async supplyFractionMint(fractionMint: PublicKey, currentMintAuthority: Keypair) {
    const transferAuthIx = createSetAuthorityInstruction(
      fractionMint, // account
      currentMintAuthority.publicKey, // current authority
      AuthorityType.MintTokens,
      this.vaultPda, // new authority
    );
    this.instructions.push(transferAuthIx);
    this.signers.push(currentMintAuthority);

    this.fractionMint = fractionMint;
    this.fractionMintAuthority = this.vaultPda;

    return this;
  }

  /**
   * 1. Fraction Mint
   * Creates a new fraction mint and gives mint authority to the vault.
   */
  async createFracionMint(payer: PublicKey) {
    const mintRentExempt = await this.connection.getMinimumBalanceForRentExemption(MintLayout.span);

    const [fractionMintIxs, fractionMintSigners, { mintAccount }] = createMint(
      payer,
      mintRentExempt,
      0,
      this.vaultPda, // mintAuthority
      this.vaultPda, // freezeAuthority
    );
    this.instructions.push(...fractionMintIxs);
    this.signers.push(...fractionMintSigners);

    this.fractionMint = mintAccount;
    this.fractionMintAuthority = this.vaultPda;

    return this;
  }

  /**
   * 2. Fraction Treasury
   *
   * Creates a fractionTreasury account owned by the vault which can hold
   * {@link fractionMint}s.
   */
  async createFractionTreasury(payer: PublicKey) {
    assert(this.hasFractionMint(), 'supply or create fraction mint first');
    const tokenAccountRentExempt = await this.connection.getMinimumBalanceForRentExemption(
      TokenAccountLayout.span,
    );

    const [fractionTreasuryIxs, fractionTreasurySigners, { tokenAccount }] = createTokenAccount(
      payer,
      tokenAccountRentExempt,
      this.fractionMint, // mint
      this.vaultPda, // owner
    );

    this.instructions.push(...fractionTreasuryIxs);
    this.signers.push(...fractionTreasurySigners);

    this.fractionTreasury = tokenAccount;

    return this;
  }

  /**
   * 3. Redeem Treasury
   *
   * Creates a redeemTreasury account owned by the vault which can hold
   * {@link priceMint}s.
   */
  async createRedeemnTreasury(payer: PublicKey) {
    const tokenAccountRentExempt = await this.connection.getMinimumBalanceForRentExemption(
      TokenAccountLayout.span,
    );

    const [redeemTreasuryIxs, redeemTreasurySigners, { tokenAccount }] = createTokenAccount(
      payer,
      tokenAccountRentExempt,
      this.priceMint, // mint
      this.vaultPda, // owner
    );

    this.instructions.push(...redeemTreasuryIxs);
    this.signers.push(...redeemTreasurySigners);

    this.redeemTreasury = tokenAccount;

    return this;
  }

  /**
   * 4. Vault
   *
   * Creates the vault account which holds all data of the vault.
   */
  async createVault(payer: PublicKey) {
    const vaultRentExempt = await Vault.getMinimumBalanceForRentExemption(this.connection);
    const uninitializedVaultIx = SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: this.vaultPair.publicKey,
      lamports: vaultRentExempt,
      space: Vault.byteSize,
      programId: VAULT_PROGRAM_ID,
    });
    this.instructions.push(uninitializedVaultIx);
    this.signers.push(this.vaultPair);

    return this;
  }

  // -----------------
  // Prepared Accounts
  // -----------------
  /**
   * Gets the accounts that are needed to init the vault and have been prepared
   * with the {@link VaultSetup} methods.
   */
  getAccounts(): InitVaultInstructionAccounts {
    this.assertComplete();
    return {
      fractionMint: this.fractionMint,
      fractionTreasury: this.fractionTreasury,
      redeemTreasury: this.redeemTreasury,
      vault: this.vaultPair.publicKey,
      authority: this.vaultAuthority,
      pricingLookupAddress: this.externalPriceAccount,
    };
  }

  // -----------------
  // Guards
  // -----------------
  hasFractionMint(this: VaultSetup): this is HasFractionMint {
    return this.fractionMint != null && this.fractionMintAuthority != null;
  }
  hasFractionTreasury(this: VaultSetup): this is HasFractionTreasury {
    return this.fractionTreasury != null;
  }
  hasRedeemTreasury(this: VaultSetup): this is HasRedeemTreasury {
    return this.redeemTreasury != null;
  }

  assertComplete(): asserts this is CompletedVaultSetup {
    assert(this.hasFractionMint(), 'need to supply or create fraction mint');
    assert(this.hasFractionTreasury(), 'need to create fraction treasury');
    assert(this.hasRedeemTreasury(), 'need to create redeem treasury');
  }
}

/**
 * Initializes the Vault.
 *
 * ### Conditions for {@link InitVaultInstructionAccounts} accounts to Init a Vault
 *
 * When setting up the vault accounts via {@link VaultSetup} methods those conditions will be met.
 *
 * All accounts holding data need to be _initialized_ and _rent exempt_.
 *
 * #### Vault
 *
 * - owned by: Vault Program
 * - is uninitialized
 *
 * #### pricingLookupAddress
 *
 * - provides: {@link ExternalPriceAccount} data
 *
 * #### fractionMint
 *
 * - owned by: Token Program
 * - supply: 0
 * - mintAuthority: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 * - freezeAuthority: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 *
 * #### fractionTreasury
 *
 * - owned by: Token Program
 * - amount: 0
 * - owner: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 * - delegate: unset
 * - closeAuthority: unset
 * - mint: fractionMint address
 *
 * #### redeemTreasury
 *
 * - owned by: Token Program
 * - amount: 0
 * - owner: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 * - delegate: unset
 * - closeAuthority: unset
 * - mint: externalPriceAccount.priceMint (via pricingLookupAddress)
 *
 * ### Updates as Result of successfull Transaction
 *
 * #### vault
 *
 * - key: {@link Key.VaultV1}
 * - accounts: addresses set to the provided accounts
 * - authority: set to authority account address
 * - tokenTypeCount: 0
 * - state: {@link VaultState.Inactive}
 *
 * @category InitVault
 * @category Instructions
 *
 * @param vaultSetup set it up via {@link VaultSetup} methods
 */
export function initVault(vaultSetup: VaultSetup, allowFurtherShareCreation: boolean) {
  const accounts = vaultSetup.getAccounts();

  const initVaultArgs: InitVaultInstructionArgs = {
    initVaultArgs: { allowFurtherShareCreation },
  };
  return createInitVaultInstruction(accounts, initVaultArgs);
}

async function vaultAccountPDA() {
  const vaultPair = Keypair.generate();
  const vaultPda = await pdaForVault(vaultPair.publicKey);
  return { vaultPair, vaultPda };
}
