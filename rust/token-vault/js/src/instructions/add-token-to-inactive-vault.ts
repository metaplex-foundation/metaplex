import { strict as assert } from 'assert';
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { VAULT_PREFIX, VAULT_PROGRAM_ID } from '../common/consts';
import {
  mintTokens,
  createMint,
  getMintRentExempt,
  createAssociatedTokenAccount,
  approveTokenTransfer,
  createVaultOwnedTokenAccount,
} from '../common/helpers';
import { getMint } from '../common/helpers.mint';
import {
  AddTokenToInactiveVaultInstructionAccounts,
  AmountArgs,
  createAddTokenToInactiveVaultInstruction,
} from '../generated';

/**
 * Allows to setup a safety deposit box and all related accounts easily.
 * It exposes the {@link PublicKey}s for all created accounts as well as the
 * {@link tokenMintPair} {@link Keypair} if it was created.
 *
 * Use {@link SafetyDepositSetup.create} in order to instantiate it.
 *
 * The {@link instructions} need to be provided to a transaction which is
 * executed before the instruction to add tokens to the vault. Make sure to
 * provide the {@link signers} with that transaction.
 *
 * The {@link SafetyDepositSetup} is then provided to {@link addTokenToInactiveVault}
 * in order to create the instruction to add the tokens to the vault.
 *
 * @category AddTokenToInactiveVault
 * @cateogry Instructions
 */
export class SafetyDepositSetup {
  private constructor(
    /** The parent vault for which this deposit box will be used */
    readonly vault: PublicKey,
    /** The account from which the tokens are transferred to the safety deposit */
    readonly tokenAccount: PublicKey,
    /** The token's mint */
    readonly tokenMint: PublicKey,
    /** Points to the spl-token account that contains the tokens */
    readonly store: PublicKey,
    /**
     * The account address at which the program will store a pointer to the
     * token account holding the tokens
     */
    readonly safetyDeposit: PublicKey,

    /**
     * Transfer Authority to move desired token amount from token account to safety deposit
     * which happens as part of processing the add token instruction.
     */
    readonly transferAuthority: PublicKey,
    /**
     * Transfer Authority keypair is not included with the signers to setup the safety deposit.
     * However it is needed when the token is added to the vault.
     * Make sure to include it as the signer when executing that transaction.
     */
    readonly transferAuthorityPair: Keypair,

    /** The amount of tokens to transfer to the store */
    readonly mintAmount: number,

    /** Instructions to run in order to setup this Safety Deposit Box*/
    readonly instructions: TransactionInstruction[],
    /** Signers to include with the setup instructions */
    readonly signers: Signer[],

    /** The Keypair of the token mint in the case that a new one was created */
    readonly tokenMintPair?: Keypair,
  ) {}

  /**
   * Prepares a {@link SafetyDepositBox} to be setup which includes
   * initializing needed accounts properly.
   *
   * Returns an instance of {@link SafetyDepositSetup} which exposes
   * instructions and signers to be included with the setup transaction.
   *
   * @param connection to solana cluster
   * @param args
   * @param args.payer payer who will own the store that will be added to the vault
   * @param args.vault the parent vault which will manage the store
   * @param args.mintAmount the amount ot mint to the token account to include with the store
   * @param args.tokenMint to mint tokens from, if not provided one will be created
   * @param args.tokenAccount the account to hold the minted toknes, if not provided one will be created
   * @param args.mintAmount the amount of tokens to mint and include with the store
   * @param args.associateTokenAccount flag indicating if created {@link
   * tokenAccount} should be associated with the {@link payer}. At this point
   * only associated accounts are supported.
   */
  static async create(
    connection: Connection,
    args: {
      payer: PublicKey;
      vault: PublicKey;
      tokenMint?: PublicKey;
      tokenAccount?: PublicKey;
      mintAmount: number;
      associateTokenAccount?: boolean;
    },
  ) {
    const { payer, vault, associateTokenAccount = true } = args;
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];

    // -----------------
    // Token Mint
    // -----------------
    let tokenMint: PublicKey;
    let tokenMintPair: Keypair | undefined;
    const mintRentExempt = await getMintRentExempt(connection);
    if (args.tokenMint != null) {
      tokenMint = args.tokenMint;

      const info = await connection.getAccountInfo(tokenMint);
      assert(info != null, 'provided mint needs to exist');
      assert(info.lamports >= mintRentExempt, 'provided mint needs to be rent exempt');

      const mint = await getMint(connection, tokenMint);
      // TODO(thlorenz): is this correct?
      assert.equal(mint.decimals, 0, 'provided mint should have 0 decimals');
    } else {
      const [createMintIxs, createMintSigners, { mintAccount, mintAccountPair }] = createMint(
        payer,
        mintRentExempt,
        0,
        payer,
        payer,
      );

      instructions.push(...createMintIxs);
      signers.push(...createMintSigners);

      tokenMint = mintAccount;
      tokenMintPair = mintAccountPair;
    }

    // -----------------
    // Token Account
    // -----------------
    let tokenAccount: PublicKey;
    if (args.tokenAccount != null) {
      tokenAccount = args.tokenAccount;
    } else {
      // TODO(thlorenz): allow unassociated accounts as well
      assert(associateTokenAccount, 'only allowing associated token accounts for now');
      const [createAtaIx, associatedTokenAccount] = await createAssociatedTokenAccount({
        payer,
        tokenOwner: payer,
        tokenMint,
      });
      tokenAccount = associatedTokenAccount;
      instructions.push(createAtaIx);
    }

    const addTokensIx = mintTokens(tokenMint, tokenAccount, payer, args.mintAmount);
    instructions.push(addTokensIx);

    // -----------------
    // Store Account
    // -----------------
    const [createStoreIxs, createStoreSigners, { tokenAccount: storeAccount }] =
      await createVaultOwnedTokenAccount(connection, payer, vault, tokenMint);
    instructions.push(...createStoreIxs);
    signers.push(...createStoreSigners);

    // -----------------
    // SafetyDeposit Account
    // -----------------
    const safetyDepositAccount = await getSafetyDepositAccount(vault, tokenMint);

    // -----------------
    // Approve Token Transfer
    // -----------------
    const [approveTransferIx, transferAuthorityPair] = approveTokenTransfer({
      owner: payer,
      sourceAccount: tokenAccount,
      amount: args.mintAmount,
    });
    instructions.push(approveTransferIx);

    return new SafetyDepositSetup(
      vault,
      tokenAccount,
      tokenMint,
      storeAccount,
      safetyDepositAccount,
      transferAuthorityPair.publicKey,
      transferAuthorityPair,
      args.mintAmount,
      instructions,
      signers,
      tokenMintPair,
    );
  }
}

/**
 * Creates the instruction which adds tokens configured via the {@link SafetyDepositSetup}
 * to the vault.
 *
 * **NOTE**: the instructions to initialize that safety deposit box need to be
 * added to a transaction to run prior to this instruction, see {@link SafetyDepositSetup.instructions}
 * and {@link SafetyDepositSetup.signers}.
 *
 * ### Conditions for {@link AddTokenToInactiveVaultInstructionAccounts} accounts to add token to vault
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Inactive}
 *
 * #### tokenAccount
 *
 * - owned by: Token Program
 * - amount: > 0 and >= {@link SafetyDepositSetup.mintAmount}
 * - mint: used to verify safetyDeposit PDA
 *
 * #### store
 *
 * - amount: 0
 * - owner: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 * - delegate: unset
 * - closeAuthority: unset
 *
 * #### transferAuthority
 *
 * - approved to transfer tokens from the tokenAccount
 *
 * #### vaultAuthority
 *
 * - address: matches vault.authority
 *
 * #### safetyDeposit
 *
 * - address: vault+tokenAccount.mint PDA (`[PREFIX, PROGRAM_ID, vault_address, tokenAccount.mint]`)
 *
 *
 * ### Updates as a result of completing the Transaction
 *
 * #### safetyDeposit
 *
 * _The account to hold the data is created and data allocated_
 *
 * - key: {@link Key.SafetyDepositBoxV1}
 * - vault: vault address
 * - tokenMint: tokenAccount.mint
 * - store: store address
 * - order: vault.tokenTypeCount (0 based)
 *
 * #### vault
 *
 * - tokenTypeCount: increased by 1
 *
 * #### store
 *
 * - credit {@link SafetyDepositSetup.mintAmount} (transferred from tokenAccount)
 *
 * ### tokenAccount
 *
 * - debit {@link SafetyDepositSetup.mintAmount} (transferred to store)
 *
 * @category AddTokenToInactiveVault
 * @cateogry Instructions
 *
 * @param safetyDepositSetup created via {@link SafetyDepositSetup.create}
 * @param ixAccounts
 * @param ixAccounts.payer funding the transaction
 * @param ixAccounts.vaultAuthority authority of the vault
 */
export async function addTokenToInactiveVault(
  safetyDepositSetup: SafetyDepositSetup,
  ixAccounts: { payer: PublicKey; vaultAuthority: PublicKey },
) {
  const { vault, safetyDeposit, transferAuthority, store, tokenAccount, mintAmount } =
    safetyDepositSetup;
  const accounts: Omit<AddTokenToInactiveVaultInstructionAccounts, 'systemAccount'> = {
    safetyDepositAccount: safetyDeposit,
    tokenAccount,
    store,
    transferAuthority,
    vault,
    payer: ixAccounts.payer,
    vaultAuthority: ixAccounts.vaultAuthority,
  };
  const instructionAccounts: AddTokenToInactiveVaultInstructionAccounts = {
    ...accounts,
    systemAccount: SystemProgram.programId,
  };

  return createAddTokenToInactiveVaultInstruction(instructionAccounts, {
    amountArgs: { amount: mintAmount },
  });
}

/**
 * Advanced version to add tokens to inactive vault.
 * It requires all {@link accounts} to be set up properly
 *
 * Please {@see addTokenToInactiveVault} for a more intuitive way to set up
 * this instruction and required accounts.
 *
 * @category AddTokenToInactiveVault
 * @cateogry Instructions
 */
export async function addTokenToInactiveVaultDirect(
  amountArgs: AmountArgs,
  accounts: Omit<AddTokenToInactiveVaultInstructionAccounts, 'systemAccount'>,
) {
  const instructionAccounts: AddTokenToInactiveVaultInstructionAccounts = {
    ...accounts,
    systemAccount: SystemProgram.programId,
  };

  return createAddTokenToInactiveVaultInstruction(instructionAccounts, { amountArgs });
}

// -----------------
// Helpers
// -----------------
async function getSafetyDepositAccount(vault: PublicKey, tokenMint: PublicKey): Promise<PublicKey> {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_PREFIX), vault.toBuffer(), tokenMint.toBuffer()],
    VAULT_PROGRAM_ID,
  );
  return pda;
}
