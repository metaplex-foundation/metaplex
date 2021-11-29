import React from "react";
import { RouteComponentProps, } from "react-router-dom";
import queryString from 'query-string';

import {
  Box,
  Button,
  CircularProgress,
  Link as HyperLink,
  Stack,
  TextField,
} from "@mui/material";
import * as anchor from '@project-serum/anchor';
import {
  useWallet,
} from '@solana/wallet-adapter-react';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AccountLayout,
} from '@solana/spl-token'
import {
  chunks,
  notify,
  TOKEN_PROGRAM_ID,
} from '@oyster/common';
import BN from 'bn.js';

import {
  useConnection,
  Connection,
} from '../contexts';
import {
  FIREBALL_PREFIX,
  FIREBALL_PROGRAM_ID,
} from '../utils/ids';
import {
  explorerLinkFor,
} from '../utils/transactions';

export type BurnCrankProps = {};

export const BurnCrank = (
  props : RouteComponentProps<BurnCrankProps>,
) => {
  const connection = useConnection();
  const wallet = useWallet();

  const anchorWallet = React.useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const [program, setProgram] = React.useState<anchor.Program | null>(null);

  React.useEffect(() => {
    if (!anchorWallet) {
      return;
    }

    const wrap = async () => {
      try {
        const provider = new anchor.Provider(connection, anchorWallet, {
          preflightCommitment: 'recent',
        });
        const idl = await anchor.Program.fetchIdl(FIREBALL_PROGRAM_ID, provider);

        const program = new anchor.Program(idl, FIREBALL_PROGRAM_ID, provider);
        setProgram(program);
      } catch (err) {
        console.error('Failed to fetch IDL', err);
      }
    };
    wrap();
  }, [anchorWallet]);

  let query = props.location.search;
  if (query && query.length > 0) {
    localStorage.setItem("burnQuery", query);
  } else {
    const stored = localStorage.getItem("burnQuery");
    if (stored)
      query = stored;
  }
  const params = queryString.parse(query);
  const [recipe, setRecipe] = React.useState(params.recipe);

  const crank = async (recipeKey : PublicKey) => {
    if (!anchorWallet || !program) {
      throw new Error(`Wallet or program is not connected`);
    }

    let recipe;
    try {
      recipe = await program.account.recipe.fetch(recipeKey);
    } catch (err) {
      throw new Error(`Failed to find recipe ${recipeKey.toBase58()}`);
    }

    const dishAccounts = await connection.getProgramAccounts(
      FIREBALL_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset:
                8 + // discriminator
                32  // authority
                ,
              bytes: recipeKey.toBase58(),
            },
          },
        ],
      },
    );

    // TODO: getMultipleAccountsInfo?
    for (const dishAccount of dishAccounts) {
      const dish = await program.coder.accounts.decode(
          "Dish", dishAccount.account.data);
      console.log(dish);
      if (!dish.completed) continue;

      const dishKey = new PublicKey(dishAccount.pubkey);

      const storeKeysAndBumps : Array<[PublicKey, number]> = await Promise.all(recipe.roots.map(
        (_, idx) => {
          const ingredientNum = new BN(idx);
          return PublicKey.findProgramAddress(
            [
              FIREBALL_PREFIX,
              dishKey.toBuffer(),
              Buffer.from(ingredientNum.toArray('le', 8)),
            ],
            FIREBALL_PROGRAM_ID,
          );
        }
      ));
      const storeAccounts = await (connection as any).getMultipleAccountsInfo(
          storeKeysAndBumps.map(s => s[0]));

      // TODO: separate on overflow
      const instrs : Array<TransactionInstruction> = [];
      for (let idx = 0; idx < recipe.roots.length; ++idx) {
        const [storeKey, storeBump] = storeKeysAndBumps[idx];
        const storeAccount = storeAccounts[idx];
        if (storeAccount === null) {
          continue;
        }

        const ingredientNum = new BN(idx);
        instrs.push(await program.instruction.consumeIngredient(
          storeBump,
          ingredientNum,
          {
            accounts: {
              recipe: recipeKey,
              dish: dishKey,
              ingredientMint: new PublicKey(AccountLayout.decode(storeAccount.data).mint),
              ingredientStore: storeKey,
              payer: anchorWallet.publicKey,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            },
            signers: [],
            instructions: [],
          }
        ));
      }

      if (instrs.length == 0) continue;

      const instrsPerTx = 6; // arb
      const chunked = chunks(instrs, instrsPerTx);
      const passed = await Connection.sendTransactions(
        program.provider.connection,
        anchorWallet,
        chunked,
        new Array<Keypair[]>(chunked.length).fill([]),
        Connection.SequenceType.StopOnFailure,
        'singleGossip',
        // success callback
        (txid: string, ind: number) => {
          notify({
            message: `Crank succeeded: ${ind + 1} of ${chunked.length}`,
            description: (
              <HyperLink href={explorerLinkFor(txid, connection)}>
                View transaction on explorer
              </HyperLink>
            ),
          });
        },
        // failure callback
        (reason: string, ind: number) => {
          console.log(`Crank for dish ${dishAccount.pubkey} failed on ${ind}: ${reason}`);
          return true;
        },
      );

      if (passed !== chunked.length) {
        throw new Error(`Crank for dish ${dishAccount.pubkey} failed`);
      }
    }
  };

  const [loading, setLoading] = React.useState(false);
  const loadingProgress = () => (
    <CircularProgress
      size={24}
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: '-12px',
        marginLeft: '-12px',
      }}
    />
  );

  return (
    <Stack spacing={2}>
      <TextField
        id="recipe-field"
        label={`Recipe`}
        value={recipe}
        inputProps={{
          sx: { fontFamily: 'Monospace' }
        }}
        onChange={e => setRecipe(e.target.value)}
      />

      <Box sx={{ position: "relative" }}>
      <Button
        disabled={!anchorWallet || loading}
        variant="contained"
        style={{ width: "100%" }}
        onClick={() => {
          setLoading(true);
          const wrap = async () => {
            try {
              await crank(new PublicKey(recipe));
              setLoading(false);
            } catch (err) {
              console.log(err);
              notify({
                message: 'Burn crank failed',
                description: err.message,
              });
              setLoading(false);
            }
          };
          wrap();
        }}
      >
        Burn
      </Button>
      {loading && loadingProgress()}
      </Box>
    </Stack>
  );

};
