export type NftCandyMachineIDL = {"version":"0.0.0","name":"nft_candy_machine","instructions":[{"name":"initialize","accounts":[{"name":"candyMachine","isMut":true,"isSigner":false},{"name":"wallet","isMut":false,"isSigner":false},{"name":"config","isMut":false,"isSigner":false},{"name":"authority","isMut":false,"isSigner":false},{"name":"payer","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[{"name":"bump","type":"u8"},{"name":"price","type":"u64"},{"name":"itemsAvailable","type":"u64"}]}],"accounts":[{"name":"candyMachine","type":{"kind":"struct","fields":[{"name":"authority","type":"publicKey"},{"name":"wallet","type":"publicKey"},{"name":"tokenMint","type":{"option":"publicKey"}},{"name":"config","type":"publicKey"},{"name":"price","type":"u64"},{"name":"itemsAvailable","type":"u64"},{"name":"itemsRedeemed","type":"u64"}]}}],"errors":[{"code":300,"name":"IncorrectOwner","msg":"Account does not have correct owner!"},{"code":301,"name":"Uninitialized","msg":"Account is not initialized!"},{"code":302,"name":"MintMismatch","msg":"Mint Mismatch!"}]};
import { IdlAccounts } from '@project-serum/anchor';



  

export type CandyMachine = IdlAccounts<NftCandyMachineIDL>["candyMachine"]
  
          