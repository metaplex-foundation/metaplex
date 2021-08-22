const anchor = require("@project-serum/anchor");

describe("nft-candy-machine", () => {
  // Configure the client to use the local cluster.
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/nft_candy_machine.json", "utf8")
  );

  // Address of the deployed program.
  const programId = new anchor.web3.PublicKey(
    "By9wpMZweby2HeYvW5PWvanbTgfpfRJXysrVdDt5u34Y"
  );

  it("Is initialized!", async () => {
    // Add your test here.
    const program = new anchor.Program(idl, programId);
    const tx = await program.rpc.initialize();
    console.log("Your transaction signature", tx);
  });
});
