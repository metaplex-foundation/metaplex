const anchor = require("@project-serum/anchor");
const CANDY_MACHINE = "candy_machine";
describe("nft-candy-machine", () => {
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

  it("Is initialized!", async () => {
    // Add your test here.
    const program = new anchor.Program(idl, programId, provider);
    const config = anchor.web3.Keypair.generate();
    const candyMachine = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(CANDY_MACHINE), config.publicKey.toBuffer()],
        programId
      )
    )[0];
    const tx = await program.rpc.initialize(
      new anchor.BN(1),
      new anchor.BN(5),
      {
        accounts: {
          candyMachine,
          wallet: myWallet.publicKey,
          config: config.publicKey,
          authority: myWallet.publicKey,
          payer: myWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [myWallet, config],
        instructions: [
          anchor.web3.SystemProgram.createAccount({
            fromPubkey: myWallet.publicKey,
            newAccountPubkey: config.publicKey,
            space: 8 + 8, // Add 8 for the account discriminator.
            lamports:
              await provider.connection.getMinimumBalanceForRentExemption(
                8 + 8
              ),
            programId: program.programId,
          }),
        ],
      }
    );
    console.log("Your transaction signature", tx);
  });
});
