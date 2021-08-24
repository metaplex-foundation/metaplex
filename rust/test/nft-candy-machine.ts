import * as anchor from "@project-serum/anchor";

import assert from "assert";

import { AccountLayout, MintLayout, Token } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { CandyMachine } from "./nft-candy-machine-types";
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

const CANDY_MACHINE = "candy_machine";
describe("nft-candy-machine", function () {
  // Configure the client to use the local cluster.
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/nft_candy_machine.json", "utf8")
  );
  const myWallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(require("fs").readFileSync(process.env.MY_WALLET, "utf8"))
    )
  );

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com/",
    "recent"
  );

  // Address of the deployed program.
  const programId = new anchor.web3.PublicKey(
    "By9wpMZweby2HeYvW5PWvanbTgfpfRJXysrVdDt5u34Y"
  );

  const walletWrapper = new anchor.Wallet(myWallet);

  const provider = new anchor.Provider(connection, walletWrapper, {
    preflightCommitment: "recent",
  });
  const program = new anchor.Program(idl, programId, provider);

  const getCandyMachine = async (config: anchor.web3.Keypair) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CANDY_MACHINE), config.publicKey.toBuffer()],
      programId
    );
  };

  const getConfig = async (
    authority: anchor.web3.PublicKey,
    name: number[]
  ) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(name)],
      programId
    );
  };

  const createConfig = async function () {
    this.authority = anchor.web3.Keypair.generate();
    this.name = [1, 2, 3, 4];
    const [config, bump] = await getConfig(this.authority.publicKey, this.name);
    this.config = config;
    this.configBump = bump;
    await program.rpc.initialize_config(bump, this.name, 5, {
      accounts: {
        config: this.config.publicKey,
        authority: this.authority.publicKey,
        payer: myWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [myWallet, this.authority],
      instructions: [
        anchor.web3.SystemProgram.transfer({
          fromPubkey: myWallet.publicKey,
          toPubkey: this.authority.publicKey,
          lamports: 5,
        }),
      ],
    });
  };

  describe("config building", function () {
    beforeEach(async function () {
      await createConfig();
    });
  });

  describe("sol only", function () {
    beforeEach(async function () {
      this.config = anchor.web3.Keypair.generate();
      const [candyMachine, bump] = await getCandyMachine(this.config);
      const tx = await program.rpc.initialize_candy_machine(
        bump,
        new anchor.BN(1),
        new anchor.BN(5),
        {
          accounts: {
            candyMachine,
            wallet: myWallet.publicKey,
            config: this.config.publicKey,
            authority: myWallet.publicKey,
            payer: myWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [myWallet, this.config],
          instructions: [
            anchor.web3.SystemProgram.createAccount({
              fromPubkey: myWallet.publicKey,
              newAccountPubkey: this.config.publicKey,
              space: 8 + 8, // Add 8 for the account discriminator.
              lamports:
                await provider.connection.getMinimumBalanceForRentExemption(
                  8 + 8
                ),
              programId: myWallet.publicKey,
            }),
          ],
        }
      );
    });

    it("Is initialized!", async function () {
      // Add your test here.
      const [candyMachine, bump] = await getCandyMachine(this.config);

      const machine: CandyMachine = await program.account.candyMachine.fetch(
        candyMachine
      );

      assert.ok(machine.wallet.equals(myWallet.publicKey));
      assert.ok(machine.config.equals(this.config.publicKey));
      assert.ok(machine.authority.equals(myWallet.publicKey));
      assert.equal(machine.price.toNumber(), new anchor.BN(1).toNumber());
      assert.equal(machine.bump, bump);
      assert.equal(
        machine.itemsAvailable.toNumber(),
        new anchor.BN(5).toNumber()
      );
      assert.equal(machine.tokenMint, null);
    });
  });

  describe("token", function () {
    const getTokenWallet = async function (mint: PublicKey) {
      return (
        await PublicKey.findProgramAddress(
          [
            myWallet.publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
      )[0];
    };

    beforeEach(async function () {
      this.config = anchor.web3.Keypair.generate();
      this.tokenMint = anchor.web3.Keypair.generate();
      const [candyMachine, bump] = await getCandyMachine(this.config);
      this.walletToken = await getTokenWallet(this.tokenMint.publicKey);
      const tx = await program.rpc.initialize_candy_machine(
        bump,
        new anchor.BN(1),
        new anchor.BN(5),
        {
          accounts: {
            candyMachine,
            wallet: this.walletToken,
            config: this.config.publicKey,
            authority: myWallet.publicKey,
            payer: myWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          remainingAccounts: [
            {
              pubkey: this.tokenMint.publicKey,
              isWritable: false,
              isSigner: true,
            },
          ],
          signers: [myWallet, this.config, this.tokenMint],
          instructions: [
            anchor.web3.SystemProgram.createAccount({
              fromPubkey: myWallet.publicKey,
              newAccountPubkey: this.config.publicKey,
              space: 8 + 8, // Add 8 for the account discriminator.
              lamports:
                await provider.connection.getMinimumBalanceForRentExemption(
                  8 + 8
                ),
              programId: myWallet.publicKey,
            }),
            anchor.web3.SystemProgram.createAccount({
              fromPubkey: myWallet.publicKey,
              newAccountPubkey: this.tokenMint.publicKey,
              space: MintLayout.span,
              lamports:
                await provider.connection.getMinimumBalanceForRentExemption(
                  MintLayout.span
                ),
              programId: TOKEN_PROGRAM_ID,
            }),
            Token.createInitMintInstruction(
              TOKEN_PROGRAM_ID,
              this.tokenMint.publicKey,
              0,
              myWallet.publicKey,
              myWallet.publicKey
            ),
            createAssociatedTokenAccountInstruction(
              this.walletToken,
              myWallet.publicKey,
              myWallet.publicKey,
              this.tokenMint.publicKey
            ),
          ],
        }
      );
    });

    it("Is initialized!", async function () {
      // Add your test here.
      const [candyMachine, bump] = await getCandyMachine(this.config);

      const machine: CandyMachine = await program.account.candyMachine.fetch(
        candyMachine
      );

      assert.ok(machine.wallet.equals(this.walletToken));
      assert.ok(machine.config.equals(this.config.publicKey));
      assert.ok(machine.authority.equals(myWallet.publicKey));
      assert.equal(machine.price.toNumber(), new anchor.BN(1).toNumber());
      assert.equal(machine.bump, bump);

      assert.equal(
        machine.itemsAvailable.toNumber(),
        new anchor.BN(5).toNumber()
      );
      assert.ok(machine.tokenMint.equals(this.tokenMint.publicKey));
    });
  });
});
