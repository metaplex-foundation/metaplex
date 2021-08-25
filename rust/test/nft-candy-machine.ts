import * as anchor from "@project-serum/anchor";

import assert from "assert";

import { AccountLayout, MintLayout, Token } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { CandyMachine, Config } from "./nft-candy-machine-types";
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
function fromUTF8Array(data: number[]) {
  // array of bytes
  let str = "",
    i;

  for (i = 0; i < data.length; i++) {
    const value = data[i];

    if (value < 0x80) {
      str += String.fromCharCode(value);
    } else if (value > 0xbf && value < 0xe0) {
      str += String.fromCharCode(((value & 0x1f) << 6) | (data[i + 1] & 0x3f));
      i += 1;
    } else if (value > 0xdf && value < 0xf0) {
      str += String.fromCharCode(
        ((value & 0x0f) << 12) |
          ((data[i + 1] & 0x3f) << 6) |
          (data[i + 2] & 0x3f)
      );
      i += 2;
    } else {
      // surrogate pair
      const charCode =
        (((value & 0x07) << 18) |
          ((data[i + 1] & 0x3f) << 12) |
          ((data[i + 2] & 0x3f) << 6) |
          (data[i + 3] & 0x3f)) -
        0x010000;

      str += String.fromCharCode(
        (charCode >> 10) | 0xd800,
        (charCode & 0x03ff) | 0xdc00
      );
      i += 3;
    }
  }

  return str;
}

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

  const getCandyMachine = async (
    config: anchor.web3.PublicKey,
    uuid: string
  ) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
      programId
    );
  };

  const getConfig = async (authority: anchor.web3.PublicKey, uuid: string) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)],
      programId
    );
  };

  const createConfig = async function (that): Promise<TransactionInstruction> {
    that.authority = anchor.web3.Keypair.generate();
    that.uuid = anchor.web3.Keypair.generate().publicKey.toBase58().slice(0, 6);
    const [config, bump] = await getConfig(that.authority.publicKey, that.uuid);
    that.config = config;
    that.configBump = bump;

    return await program.instruction.initializeConfig(
      bump,
      that.uuid,
      10,
      "SYMBOL",
      500,
      [{ address: myWallet.publicKey, verified: false, share: 100 }],
      {
        accounts: {
          config: that.config,
          authority: that.authority.publicKey,
          payer: myWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [myWallet],
      }
    );
  };

  const addConfigLines = async function (
    that
  ): Promise<TransactionInstruction[]> {
    const sample = {
      uri: "www.aol.com",
      isMutable: true,
    };
    const firstVec = [];
    for (let i = 0; i < 5; i++) {
      firstVec.push({ ...sample, name: `Sample ${i}` });
    }
    const secondVec = [];
    for (let i = 5; i < 10; i++) {
      secondVec.push({ ...sample, name: `Sample ${i}` });
    }
    const tx1 = await program.instruction.addConfigLines(0, firstVec, {
      accounts: {
        config: that.config,
        authority: that.authority.publicKey,
      },
      signers: [that.authority, myWallet],
    });

    const tx2 = await program.instruction.addConfigLines(5, secondVec, {
      accounts: {
        config: that.config,
        authority: that.authority.publicKey,
      },
      signers: [that.authority, myWallet],
    });
    return [tx1, tx2];
  };

  describe("sol only", function () {
    beforeEach(async function () {
      const txInstr = await createConfig(this);
      const linesInstr = await addConfigLines(this);

      this.candyMachineUuid = anchor.web3.Keypair.generate()
        .publicKey.toBase58()
        .slice(0, 6);
      const [candyMachine, bump] = await getCandyMachine(
        this.config,
        this.candyMachineUuid
      );
      try {
        const tx = await program.rpc.initializeCandyMachine(
          bump,
          this.candyMachineUuid,
          new anchor.BN(1),
          new anchor.BN(5),
          null,
          {
            accounts: {
              candyMachine,
              wallet: myWallet.publicKey,
              config: this.config,
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
              txInstr,
              ...linesInstr,
            ],
          }
        );
      } catch (e) {
        console.log(e);
        throw e;
      }
    });

    it("has all ten lines", async function () {
      const config = await connection.getAccountInfo(this.config);
      const configArrayStart =
        1 + // bump
        32 + // authority
        4 +
        6 + // uuid + u32 len
        4 +
        10 + // u32 len + symbol
        2 + // seller fee basis points
        1 +
        4 +
        5 * 34 + // optional + u32 len + actual vec
        4; // max number of lines;
      const configLineSize = 4 + 32 + 4 + 200 + 1;
      const amountOfConfigs = new anchor.BN(
        config.data.slice(configArrayStart, configArrayStart + 4),
        "le"
      );
      assert.equal(amountOfConfigs.toNumber(), 10);
      for (let i = 0; i < amountOfConfigs.toNumber(); i++) {
        const thisSlice = config.data.slice(
          configArrayStart + 4 + configLineSize * i,
          configArrayStart + 4 + configLineSize * (i + 1)
        );
        const name = fromUTF8Array([...thisSlice.slice(4, 36)]);
        const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
        const isMutable = thisSlice[241] != 0;
        assert.equal(name.replace(/\0/g, "").trim(), `Sample ${i}`);
        assert.equal(uri.replace(/\0/g, "").trim(), "www.aol.com");
        assert.equal(isMutable, true);
      }
    });

    it("Is initialized!", async function () {
      // Add your test here.
      const [candyMachine, bump] = await getCandyMachine(
        this.config,
        this.candyMachineUuid
      );

      const machine: CandyMachine = await program.account.candyMachine.fetch(
        candyMachine
      );
      assert.equal(machine.uuid, this.candyMachineUuid);
      assert.ok(machine.wallet.equals(myWallet.publicKey));
      assert.ok(machine.config.equals(this.config));
      assert.ok(machine.authority.equals(this.authority.publicKey));
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
      const txInstr = await createConfig(this);
      const linesInstr = await addConfigLines(this);
      this.tokenMint = anchor.web3.Keypair.generate();
      this.candyMachineUuid = anchor.web3.Keypair.generate()
        .publicKey.toBase58()
        .slice(0, 6);
      const [candyMachine, bump] = await getCandyMachine(
        this.config,
        this.candyMachineUuid
      );
      this.walletToken = await getTokenWallet(this.tokenMint.publicKey);
      try {
        const tx = await program.rpc.initializeCandyMachine(
          bump,
          this.candyMachineUuid,
          new anchor.BN(1),
          new anchor.BN(5),
          null,
          {
            accounts: {
              candyMachine,
              wallet: this.walletToken,
              config: this.config,
              authority: this.authority.publicKey,
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
            signers: [myWallet, this.tokenMint, this.authority],
            instructions: [
              anchor.web3.SystemProgram.transfer({
                fromPubkey: myWallet.publicKey,
                toPubkey: this.authority.publicKey,
                lamports: 5,
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
              txInstr,
              ...linesInstr,
            ],
          }
        );
      } catch (e) {
        console.log(e);
        throw e;
      }
    });

    it("Is initialized!", async function () {
      // Add your test here.
      const [candyMachine, bump] = await getCandyMachine(
        this.config,
        this.candyMachineUuid
      );

      const machine: CandyMachine = await program.account.candyMachine.fetch(
        candyMachine
      );

      assert.equal(machine.uuid, this.candyMachineUuid);
      assert.ok(machine.wallet.equals(this.walletToken));
      assert.ok(machine.config.equals(this.config));
      assert.ok(machine.authority.equals(this.authority.publicKey));
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
