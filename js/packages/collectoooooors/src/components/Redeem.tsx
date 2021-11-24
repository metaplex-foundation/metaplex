import React from "react";

import {
  Button,
  CircularProgress,
  IconButton,
  Link as HyperLink,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  AccountLayout,
} from '@solana/spl-token'
import * as anchor from '@project-serum/anchor';
import {
  decodeMetadata,
  notify,
  shortenAddress,
  useLocalStorageState,
  TOKEN_PROGRAM_ID,
} from '@oyster/common';
import {
  useWallet,
} from '@solana/wallet-adapter-react';
import { sha256 } from "js-sha256";
import BN from 'bn.js';

import {
  useConnection,
  Connection,
} from '../contexts';
import {
  getAssociatedTokenAccount,
  getMetadata,
} from '../utils/accounts';
import {
  COLLECTOOOOOORS_PREFIX,
  COLLECTOOOOOORS_PROGRAM_ID,
} from '../utils/ids';
import {
  envFor,
  explorerLinkFor,
} from '../utils/transactions';
import {
  MerkleTree,
} from "../utils/merkleTree";

type RelevantMint = {
  mint: PublicKey,
  name: string,
  image: string,
  ingredient: string,
}

export const Redeem = () => {
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
        const idl = await anchor.Program.fetchIdl(COLLECTOOOOOORS_PROGRAM_ID, provider);

        const program = new anchor.Program(idl, COLLECTOOOOOORS_PROGRAM_ID, provider);
        setProgram(program);
      } catch (err) {
        console.error('Failed to fetch IDL', err);
      }
    };
    wrap();
  }, [anchorWallet]);

  const [recipe, setRecipe] = useLocalStorageState(
    "recipe",
    "",
  );

  const [relevantMints, setRelevantMints] = React.useState<Array<RelevantMint>>([]);
  const [ingredientList, setIngredientList] = React.useState<Array<any> | null>(null);
  const [ingredients, setIngredients] = React.useState<{ [key: string]: (PublicKey | null) }>({});

  // TODO: on page load also
  const fetchRelevantMints = async (key : PublicKey) => {
    console.log(key.toBase58());
    if (!anchorWallet || !program) {
      return;
    }

    let recipe;
    try {
      recipe = await program.account.recipe.fetch(key);
    } catch (err) {
      console.log('Failed to find recipe');
      return;
    }

    const ingredientUrl = recipe.ingredients.replace(/\0/g, '');
    const ingredientList = await (await fetch(ingredientUrl)).json();

    setIngredientList(ingredientList);
    setIngredients(ingredientList.reduce(
      (a, group) => ({ ...a, [group.ingredient]: null }),
      {},
    ));

    const mints = {};
    for (const group of ingredientList)
      for (const mint of group.mints)
        mints[mint] = group.ingredient;

    const owned = await connection.getTokenAccountsByOwner(
        anchorWallet.publicKey,
        { programId: TOKEN_PROGRAM_ID },
      );

    const decoded = owned.value.map(v => AccountLayout.decode(v.account.data));
    const relevant = decoded.filter(a => (new PublicKey(a.mint).toBase58()) in mints);
    console.log(relevant);

    const ret : Array<RelevantMint> = [];

    // TODO: get multiple accounts
    for (const r of relevant) {
      const mintKey = new PublicKey(r.mint);
      const metadataKey = await getMetadata(mintKey);
      const metadataAccount = await connection.getAccountInfo(metadataKey);
      if (metadataAccount === null) {
        notify({
          message: 'Fetch relevant mints failed',
          description: `Could not fetch metadata for mint ${r.mint}`,
        });
        continue;
      }
      const metadata = decodeMetadata(metadataAccount.data);
      const schema = await (await fetch(metadata.data.uri)).json();

      console.log(schema);

      ret.push({
        mint: mintKey,
        name: metadata.data.name,
        image: schema.image,
        ingredient: mints[mintKey.toBase58()],
      });
    }

    setRelevantMints(ret);
  };

  const addIngredient = async (e : React.SyntheticEvent, mint: PublicKey) => {
    e.preventDefault();

    for (const r of relevantMints) {
      if (!r.mint.equals(mint))
        continue;

      if (ingredients[r.ingredient] !== null) {
        throw new Error(`Ingredient ${r.ingredient} has already been added to this dish`);
      }

      // TODO: check that PDA also doesn't exist
      setIngredients({
        ...ingredients,
        [r.ingredient]: mint,
      });
    }
  };

  const removeIngredient = async (e : React.SyntheticEvent, mint: PublicKey) => {
    e.preventDefault();

    for (const r of relevantMints) {
      if (!r.mint.equals(mint))
        continue;

      if (!(r.ingredient in ingredients)) {
        throw new Error(`Ingredient ${r.ingredient} has not been added to this dish`);
      }

      // TODO: remove from dish PDA also
      setIngredients({
        ...ingredients,
        [r.ingredient]: null,
      });
    }
  };

  const submitDishChanges = async (e : React.SyntheticEvent) => {
    e.preventDefault();
    if (!anchorWallet || !program) {
      throw new Error(`Wallet or program is not connected`);
      return;
    }

    if (!ingredientList) {
      throw new Error(`No ingredient list`);
    }

    console.log(ingredientList);

    const recipeKey = new PublicKey(recipe);
    const [dishKey, dishBump] = await PublicKey.findProgramAddress(
      [
        COLLECTOOOOOORS_PREFIX,
        recipeKey.toBuffer(),
        anchorWallet.publicKey.toBuffer(),
      ],
      COLLECTOOOOOORS_PROGRAM_ID,
    );

    const setup : Array<TransactionInstruction> = [];

    const dishAccount = await connection.getAccountInfo(dishKey);
    if (dishAccount === null) {
      setup.push(await program.instruction.startDish(
        dishBump,
        {
          accounts: {
            recipe: recipeKey,
            dish: dishKey,
            payer: anchorWallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
          signers: [],
          instructions: [],
        }
      ));
    }

    for (let idx = 0; idx < ingredientList.length; ++idx) {
      const group = ingredientList[idx];
      const newMint = ingredients[group.ingredient];

      const ingredientNum = new BN(idx);
      const [storeKey, storeBump] = await PublicKey.findProgramAddress(
        [
          COLLECTOOOOOORS_PREFIX,
          dishKey.toBuffer(),
          Buffer.from(ingredientNum.toArray('le', 8)),
        ],
        COLLECTOOOOOORS_PROGRAM_ID,
      );

      const storeAccount = await connection.getAccountInfo(storeKey);
      if (storeAccount === null) {
        // nothing
      } else {
        const currentStore = AccountLayout.decode(Buffer.from(storeAccount.data));
        const currentMint = new PublicKey(currentStore.mint);
        if (newMint === null) {
          // nothing to remove
        } else if (currentMint.equals(newMint)) {
          // already added this mint. don't need to do anything else
          // TODO: fix up control flow
          continue;
        } else {
          const walletATA = await getAssociatedTokenAccount(
            anchorWallet.publicKey, currentMint, connection);
          setup.push(await program.instruction.removeIngredient(
            storeBump,
            ingredientNum,
            {
              accounts: {
                dish: dishKey,
                ingredientMint: currentMint,
                ingredientStore: storeKey,
                payer: anchorWallet.publicKey,
                to: walletATA,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
              },
              signers: [],
              instructions: [],
            }
          ));
        }
      }

      if (newMint === null) {
        continue;
      }

      // TODO: cache?
      const mintsKeys = group.mints.map(m => new PublicKey(m));
      const mintIdx = mintsKeys.findIndex(m => m.equals(newMint));
      if (mintIdx === -1) {
        throw new Error(`Could not find mint matching ${newMint.toBase58()} in ingredient group ${group.ingredient}`);
      }

      const tree = new MerkleTree(mintsKeys.map(m => m.toBuffer()));
      const proof = tree.getProof(mintIdx);
      const walletATA = await getAssociatedTokenAccount(
        anchorWallet.publicKey, newMint, connection);
      setup.push(await program.instruction.addIngredient(
        storeBump,
        ingredientNum,
        proof,
        {
          accounts: {
            recipe: recipeKey,
            dish: dishKey,
            ingredientMint: newMint,
            ingredientStore: storeKey,
            payer: anchorWallet.publicKey,
            from: walletATA,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          },
          signers: [],
          instructions: [],
        }
      ));
    }

    if (setup.length === 0) {
      return;
    }

    console.log(setup);

    // TODO: batching into separate transactions...
    const submitResult = await Connection.sendTransactionWithRetry(
      program.provider.connection,
      anchorWallet,
      setup,
      [],
    );

    console.log(submitResult);

    if (typeof submitResult === "string") {
      throw new Error(submitResult);
    } else {
      notify({
        message: "Dish Changes succeeded",
        description: (
          <HyperLink href={explorerLinkFor(submitResult.txid, connection)}>
            View transaction on explorer
          </HyperLink>
        ),
      });
    }
  };

  const fixup = async (e : React.SyntheticEvent) => {
    e.preventDefault();
    if (!anchorWallet || !program) {
      throw new Error(`Wallet or program is not connected`);
      return;
    }

    const recipeKey = new PublicKey(recipe);
    const [dishKey, ] = await PublicKey.findProgramAddress(
      [
        COLLECTOOOOOORS_PREFIX,
        recipeKey.toBuffer(),
        anchorWallet.publicKey.toBuffer(),
      ],
      COLLECTOOOOOORS_PROGRAM_ID,
    );

    const instr = new TransactionInstruction({
        programId: COLLECTOOOOOORS_PROGRAM_ID,
        keys: [
            { pubkey: dishKey, isSigner: false  , isWritable: true } ,
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest("global:fixup")).slice(0, 8),
        ])
    });
    const fixupResult = await Connection.sendTransactionWithRetry(
      program.provider.connection,
      anchorWallet,
      [instr],
      [],
    );

    console.log(fixupResult);

    if (typeof fixupResult === "string") {
      throw new Error(fixupResult);
    } else {
      notify({
        message: "Fixup succeeded",
        description: (
          <HyperLink href={explorerLinkFor(fixupResult.txid, connection)}>
            View transaction on explorer
          </HyperLink>
        ),
      });
    }
  };

  const explorerLinkForAddress = (key : PublicKey, shorten: boolean = true) => {
    return (
      <HyperLink
        href={`https://explorer.solana.com/address/${key.toBase58()}?cluster=${envFor(connection)}`}
        target="_blank"
        rel="noreferrer"
        title={key.toBase58()}
        underline="none"
      >
        {shorten ? shortenAddress(key.toBase58()) : key.toBase58()}
      </HyperLink>
    );
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
        onChange={e => {
          try {
            const key = new PublicKey(e.target.value);
            setLoading(true);
            const wrap = async () => {
              try {
                await fetchRelevantMints(key);
                setLoading(false);
              } catch (err) {
                notify({
                  message: 'Fetch relevant mints failed',
                  description: `${err}`,
                });
                setLoading(false);
              }
            };
            wrap();
          } catch (err) {
            console.log(err);
          }
          setRecipe(e.target.value)
        }}
      />
      {loading && loadingProgress()}
      {Object.keys(ingredients).length > 0 && <Button
        disabled={!anchorWallet || loading}
        variant="contained"
        style={{ width: "100%" }}
        onClick={(e) => {
          setLoading(true);
          const wrap = async () => {
            try {
              await submitDishChanges(e);
              setLoading(false);
            } catch (err) {
              notify({
                message: `Dish Changes failed`,
                description: `${err}`,
              });
              setLoading(false);
            }
          };
          wrap();
        }}
      >
        Submit Dish Changes
      </Button>}
      {Object.keys(ingredients).length > 0 && <Button
        disabled={!anchorWallet || loading}
        variant="contained"
        style={{ width: "100%" }}
        onClick={(e) => {
          setLoading(true);
          const wrap = async () => {
            try {
              await fixup(e);
              setLoading(false);
            } catch (err) {
              notify({
                message: `Dish Changes failed`,
                description: `${err}`,
              });
              setLoading(false);
            }
          };
          wrap();
        }}
      >
        Fixup
      </Button>}
      {Object.keys(ingredients).length > 0 && <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ingredient</TableCell>
              <TableCell>Mint</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(ingredients).map((ingredient, idx) => {
              const mint = ingredients[ingredient];
              return (
                <TableRow
                  key={idx}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {ingredient}
                  </TableCell>
                  <TableCell>
                    {mint ? explorerLinkForAddress(mint, false) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>}
      <ImageList cols={2}>
        {relevantMints.map((r, idx) => {
          return (
            <ImageListItem key={idx}>
              <img
                src={r.image}
                alt={r.name}
              />
              <ImageListItemBar
                title={`${r.name} (${r.ingredient})`}
                subtitle={explorerLinkForAddress(r.mint)}
                actionIcon={
                  (() => {
                    // TODO: check that PDA also doesn't exist
                    const inBatch = ingredients[r.ingredient]?.equals(r.mint);
                    return (
                      <IconButton
                        onClick={e => {
                          setLoading(true);
                          const wrap = async () => {
                            try {
                              inBatch
                                ? await removeIngredient(e, r.mint)
                                : await addIngredient(e, r.mint);
                              setLoading(false);
                            } catch (err) {
                              notify({
                                message: `${inBatch ? 'Remove': 'add'} ingredient failed`,
                                description: `${err}`,
                              });
                              setLoading(false);
                            }
                          };
                          wrap();
                        }}
                      >
                        {inBatch ? <RemoveIcon /> : <AddIcon />}
                      </IconButton>
                    );
                  })()
                }
              / >
            </ImageListItem>
          );
        })}
      </ImageList>
    </Stack>
  );
};
