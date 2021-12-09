import React from "react";
import { RouteComponentProps, } from "react-router-dom";
import queryString from 'query-string';

import ContentLoader from 'react-content-loader';
import { Image } from 'antd';
import {
  Box,
  Button,
  CircularProgress,
  Link as HyperLink,
  ImageList,
  ImageListItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";

import {
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  Token,
} from '@solana/spl-token'
import * as anchor from '@project-serum/anchor';
import {
  chunks,
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  getMultipleAccounts, // wrapper that does chunking
  getUnixTs,
  Metadata,
  MetadataKey,
  notify,
  shortenAddress,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@oyster/common';
import {
  useWallet,
} from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { capitalize } from 'lodash';

import {
  useColorMode,
  useConnection,
  Connection,
} from '../contexts';
import {
  getAssociatedTokenAccount,
  getEdition,
  getEditionMarkerPda,
  getMetadata,
} from '../utils/accounts';
import {
  FIREBALL_PREFIX,
  FIREBALL_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from '../utils/ids';
import {
  envFor,
  explorerLinkFor,
} from '../utils/transactions';
import {
  MerkleTree,
} from "../utils/merkleTree";

export const HoverButton = (
  props : {
    handleClick : (e : React.SyntheticEvent) => void,
    hoverDisplay : React.ReactNode,
    children : React.ReactNode,
    padding : number,
    disabled : boolean,
  },
) => {
  const [hovering, setHovering] = React.useState(false);

  const colorModeCtx = useColorMode();
  const shade = colorModeCtx.mode === 'dark' ? "rgba(255,255,255,.2)" : "rgba(0, 0, 0,.2)";

  return (
    <Button
      onMouseOver={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={props.handleClick}
      disabled={props.disabled}
      disableRipple={true}
      variant="contained"
      style={{
        padding: props.padding,
        textTransform: "none",
        color: "white",
        backgroundColor: shade,
      }}
    >
      <Box sx={{ position: "relative" }}>
        {props.children}
        {hovering && (
          <React.Fragment>
            <Box
              sx={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "rgba(0, 0, 0, .75)",
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                margin: 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              {props.hoverDisplay}
            </Box>
          </React.Fragment>
        )}
      </Box>
    </Button>
  );
};

export const ThreeDots = () => (
  <ContentLoader
    viewBox="0 0 212 200"
    height={200}
    width={212}
    backgroundColor="transparent"
    style={{
      width: '100%',
      margin: 'auto',
    }}
  >
    <circle cx="86" cy="100" r="8" />
    <circle cx="106" cy="100" r="8" />
    <circle cx="126" cy="100" r="8" />
  </ContentLoader>
);

const LoadingImage = (
  props : {
    url : string,
  },
) => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  return (
    <Image
      src={props.url}
      onLoad={() => {
        setLoaded(true);
      }}
      placeholder={<ThreeDots />}
      {...(loaded ? {} : { height: "100%" })}
    />
  );
}

const createMintAndAccount = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  mint : PublicKey,
  setup : Array<TransactionInstruction>,
) => {
  const walletTokenKey = await getAssociatedTokenAccount(
      walletKey, mint);

  setup.push(SystemProgram.createAccount({
    fromPubkey: walletKey,
    newAccountPubkey: mint,
    space: MintLayout.span,
    lamports:
      await connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      ),
    programId: TOKEN_PROGRAM_ID,
  }));

  setup.push(Token.createInitMintInstruction(
    TOKEN_PROGRAM_ID,
    mint,
    0,
    walletKey,
    walletKey,
  ));

  setup.push(Token.createAssociatedTokenAccountInstruction(
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint,
    walletTokenKey,
    walletKey,
    walletKey
  ));

  setup.push(Token.createMintToInstruction(
    TOKEN_PROGRAM_ID,
    mint,
    walletTokenKey,
    walletKey,
    [],
    1,
  ));

}

type MintAndImage = {
  mint: PublicKey,
  name: string,
  image: string,
};

type RelevantMint = MintAndImage & { ingredient : string };

// remaining is never technically strictly up-to-date...
// TODO: add as of block height?
type RecipeYield = MintAndImage & { remaining : number };

const fetchMintsAndImages = async (
  connection : RPCConnection,
  mintKeys : Array<PublicKey>
) : Promise<Array<MintAndImage>> => {
  const metadataKeys = await Promise.all(mintKeys.map(getMetadata));
  const metadataAccounts = await (connection as any).getMultipleAccountsInfo(metadataKeys);

  const metadatasDecoded : Array<Metadata> = metadataAccounts
    .map((account, idx) => {
      if (account === null) {
        const missingMint = mintKeys[idx].toBase58();
        notify({
          message: 'Fetch mint failed',
          description: `Could not fetch metadata for mint ${missingMint}`,
        });
        return null;
      }

      return decodeMetadata(account.data);
    })
    .filter((ret) : ret is Metadata => ret !== null);

  const schemas = await Promise.all(metadatasDecoded.map(m => fetch(m.data.uri)));
  const schemaJsons = await Promise.all(schemas.map(s => s.json()));

  console.log(schemaJsons);

  return schemaJsons.map((schema, idx) => {
    return {
      mint: mintKeys[idx],
      name: metadatasDecoded[idx].data.name,
      image: schema.image,
    };
  });
};

const getRecipeYields = async (
  connection : RPCConnection,
  recipeKey : PublicKey,
) => {
  const [recipeMintOwner, ] = await PublicKey.findProgramAddress(
    [
      FIREBALL_PREFIX,
      recipeKey.toBuffer(),
    ],
    FIREBALL_PROGRAM_ID
  );

  const yieldsAccounts = await connection.getTokenAccountsByOwner(
      recipeMintOwner,
      { programId: TOKEN_PROGRAM_ID },
    );
  const yieldsDecoded = yieldsAccounts.value.map(v => AccountLayout.decode(v.account.data));
  const masterMints = yieldsDecoded
    .filter(r => new BN(r.amount, 'le').toNumber() > 0)
    .map(r => new PublicKey(r.mint));

  const masterEditions = await Promise.all(masterMints.map(m => getEdition(m)));

  const editionAccounts = await (connection as any).getMultipleAccountsInfo(masterEditions);
  const remaining = editionAccounts
    .map((account, idx) => {
      if (account === null) {
        const missingMint = masterMints[idx].toBase58();
        notify({
          message: 'Fetch mint failed',
          description: `Could not fetch master edition for mint ${missingMint}`,
        });
        return NaN;
      }

      const edition = decodeMasterEdition(account.data);
      if (!edition.maxSupply) {
        return NaN;
      }
      const maxSupply = new BN(edition.maxSupply);
      const supply = new BN(edition.supply);
      if (supply.gte(maxSupply)) {
        return 0;
      } else {
        return maxSupply.sub(supply).toNumber();
      }
    })
    .reduce((acc, n, idx) => {
      return {
        ...acc,
        [masterMints[idx].toBase58()]: n,
      }
    },
    {});

  return (await fetchMintsAndImages(
      connection,
      masterMints,
    ))
    .map(r => ({ ...r, remaining: remaining[r.mint.toBase58()] }));
};

const getOnChainIngredients = async (
  connection : RPCConnection,
  recipeKey : PublicKey,
  walletKey : PublicKey,
  ingredientList : Array<any>,
) => {
  const [dishKey, ] = await PublicKey.findProgramAddress(
    [
      FIREBALL_PREFIX,
      recipeKey.toBuffer(),
      walletKey.toBuffer(),
    ],
    FIREBALL_PROGRAM_ID,
  );

  const storeKeys = await Promise.all(ingredientList.map((group, idx) => {
          const ingredientNum = new BN(idx);
          return PublicKey.findProgramAddress(
            [
              FIREBALL_PREFIX,
              dishKey.toBuffer(),
              Buffer.from(ingredientNum.toArray('le', 8)),
            ],
            FIREBALL_PROGRAM_ID,
          );
        }));

  const storeAccounts = await (connection as any).getMultipleAccountsInfo(storeKeys.map(s => s[0]));

  const mints = {};
  for (let idx = 0; idx < ingredientList.length; ++idx) {
    const group = ingredientList[idx];
    const storeAccount = storeAccounts[idx];
    if (storeAccount !== null) {
      const currentStore = AccountLayout.decode(Buffer.from(storeAccount.data));
      mints[new PublicKey(currentStore.mint).toBase58()] = group.ingredient;
    }
  }
  console.log(mints);
  const ingredientImages = await fetchMintsAndImages(
      connection, Object.keys(mints).map(r => new PublicKey(r)));
  const ret = ingredientImages.map(
      r => ({ ...r, ingredient: mints[r.mint.toBase58()] }));
  ret.sort((lft, rht) => lft.ingredient.localeCompare(rht.ingredient));
  return ret;
};

const getRelevantTokenAccounts = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  ingredientList : Array<any>,
) => {
  const mints = {};
  for (const group of ingredientList)
    for (const [idx, mint] of group.mints.entries())
      mints[mint] = {
        ingredient: group.ingredient,
        allowLimitedEdition: group.allowLimitedEditions && group.allowLimitedEditions[idx],
      };

  const mintEditions = {}
  for (const m of Object.keys(mints)) {
    const edition = (await getEdition(new PublicKey(m))).toBase58();
    mintEditions[edition] = {
      allowLimitedEdition: mints[m].allowLimitedEdition,
      ingredient: mints[m].ingredient,
    };
  }

  const owned = await connection.getTokenAccountsByOwner(
      walletKey,
      { programId: TOKEN_PROGRAM_ID },
    );

  const decoded = owned.value.map(v => AccountLayout.decode(v.account.data));
  // TODO: can we skip some of these when allowLimitedEditions is false?
  const editionKeys = await Promise.all(decoded.map(async (a) => {
    const mint = new PublicKey(a.mint);
    return (await getEdition(mint)).toBase58();
  }));
  const editionDatas = (await getMultipleAccounts(
    // TODO: different commitment?
    connection, editionKeys, 'processed')).array;
  const editionParentKeys = editionDatas.map(e => {
    if (!e) {
      // shouldn't happen?
      return undefined;
    }
    if (e.data[0] == MetadataKey.EditionV1) {
      return decodeEdition(e.data).parent;
    } else {
      return undefined;
    }
  });
  const relevant = decoded
    .map((a, idx) => ({ ...a, editionParentKey: editionParentKeys[idx] }))
    .filter(a => {
    const editionParentKey = a.editionParentKey;
    const mintMatches =
      (new PublicKey(a.mint).toBase58()) in mints
      || (editionParentKey && mintEditions[editionParentKey]?.allowLimitedEdition);
    const hasToken = new BN(a.amount, 'le').toNumber() > 0;
    return mintMatches && hasToken;
  });

  // TODO: getMultipleAccounts
  const relevantImages = await fetchMintsAndImages(
      connection, relevant.map(r => new PublicKey(r.mint)));
  const ret = relevantImages.map((r, idx) => {
    // TODO: better
    const mint = r.mint.toBase58();
    const editionParentKey = relevant[idx].editionParentKey;
    return {
      ...r,
      ingredient: mint in mints
        ? mints[mint].ingredient
        : mintEditions[editionParentKey].ingredient,  // lookup by parent edition
    }
  });
  console.log(ret);
  ret.sort((lft, rht) => lft.ingredient.localeCompare(rht.ingredient));
  return ret;
};

enum IngredientView {
  add = 'add',
  recover = 'recover',
}

export type RedeemProps = {};

export const Redeem = (
  props : RouteComponentProps<RedeemProps>,
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
    localStorage.setItem("redeemQuery", query);
  } else {
    const stored = localStorage.getItem("redeemQuery");
    if (stored)
      query = stored;
  }
  const params = queryString.parse(query);
  const [recipe, setRecipe] = React.useState(params.recipe);

  const [recipeYields, setRecipeYields] = React.useState<Array<RecipeYield>>([]);
  const [relevantMints, setRelevantMints] = React.useState<Array<RelevantMint>>([]);
  const [ingredientList, setIngredientList] = React.useState<Array<any>>([]);
  const [dishIngredients, setIngredients] = React.useState<Array<RelevantMint>>([]);
  const [changeList, setChangeList] = React.useState<Array<any>>([]);
  const [ingredientView, setIngredientView] = React.useState(IngredientView.add);

  // TODO: on page load also
  const fetchRelevantMints = async (recipeKey : PublicKey) => {
    if (!anchorWallet || !program) {
      return;
    }

    const startTime = getUnixTs();
    let recipe;
    try {
      recipe = await program.account.recipe.fetch(recipeKey);
    } catch (err) {
      throw new Error(`Failed to find recipe ${recipeKey.toBase58()}`);
    }

    console.log('Finished recipe fetch', getUnixTs() - startTime);

    const ingredientUrl = recipe.ingredients.replace(/\0/g, '');
    const ingredientList = await (await fetch(ingredientUrl)).json();

    console.log('Finished ingerdients fetch', getUnixTs() - startTime);

    if (recipe.roots.length !== ingredientList.length) {
      throw new Error(`Recipe has a different number of ingredient lists and merkle hashes. Bad configuration`);
    }

    // cache for later...
    setIngredientList(ingredientList);

    setIngredients(await getOnChainIngredients(
          connection, recipeKey, anchorWallet.publicKey, ingredientList));

    console.log('Finished on-chain ingredients fetch', getUnixTs() - startTime);

    setRelevantMints(await getRelevantTokenAccounts(
          connection, anchorWallet.publicKey, ingredientList));

    console.log('Finished relevant tokens fetch', getUnixTs() - startTime);
  };

  const addIngredient = async (e : React.SyntheticEvent, ingredient: string, mint: PublicKey) => {
    // TODO: less hacky. let the link click go through
    if ((e.target as any).href !== undefined) {
      return;
    } else {
      e.preventDefault();
    }

    if (dishIngredients.find(c => c.ingredient === ingredient)) {
      throw new Error(`Ingredient ${ingredient} has already been added to this dish`);
    }

    const match = changeList.find(c => c.ingredient === ingredient);
    if (match) {
      if (match.mint.equals(mint)) return;
      if (match.operation !== 'add') {
        throw new Error(`Internal error: Cannot recover and add a mint`);
      }
      const prev = match.mint.toBase58();
      const next = mint.toBase58();
      notify({
        message: "Dish Changes",
        description: `Replaced ingredient ${prev} with ${next}`,
      });

      match.mint = mint;
    } else {
      setChangeList(
        [
          ...changeList,
          {
            ingredient: ingredient,
            mint: mint,
            operation: IngredientView.add,
          },
        ]
      );
    }
  };

  const recoverIngredient = async (e : React.SyntheticEvent, ingredient : string) => {
    // TODO: less hacky. let the link click go through
    if ((e.target as any).href !== undefined) {
      return;
    } else {
      e.preventDefault();
    }

    const mint = dishIngredients.find(c => c.ingredient === ingredient);
    if (!mint) {
      throw new Error(`Ingredient ${ingredient} is not part of this dish`);
    }

    const match = changeList.find(c => c.ingredient === ingredient);
    if (match) {
      if (match.mint !== mint.mint || match.operation !== 'recover') {
        throw new Error(`Internal error: Cannot recover and add a mint`);
      }
      // already added
    } else {
      setChangeList(
        [
          ...changeList,
          {
            ingredient: ingredient,
            mint: mint.mint,
            operation: IngredientView.recover,
          },
        ]
      );
    }
  };

  const cancelChangeForIngredient = async (e : React.SyntheticEvent, ingredient: string) => {
    // TODO: less hacky. let the link click go through
    if ((e.target as any).href !== undefined) {
      return;
    } else {
      e.preventDefault();
    }

    const newList = [...changeList];
    const idx = newList.findIndex(c => c.ingredient === ingredient);
    if (idx === -1) {
      throw new Error(`Ingredient ${ingredient} is not part of the change-list`);
    }

    newList.splice(idx, 1);
    setChangeList(newList);
  };

  const submitDishChanges = async (e : React.SyntheticEvent) => {
    e.preventDefault();
    if (!anchorWallet || !program) {
      throw new Error(`Wallet or program is not connected`);
      return;
    }

    if (ingredientList.length === 0) {
      throw new Error(`No ingredient list`);
    }

    const startTime = getUnixTs();

    const recipeKey = new PublicKey(recipe);
    const [dishKey, dishBump] = await PublicKey.findProgramAddress(
      [
        FIREBALL_PREFIX,
        recipeKey.toBuffer(),
        anchorWallet.publicKey.toBuffer(),
      ],
      FIREBALL_PROGRAM_ID,
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

    console.log('Finished finding dish', getUnixTs() - startTime);

    const storeKeysAndBumps = await Promise.all(ingredientList.map(
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
    console.log('Finished fetching stores', getUnixTs() - startTime);
    for (let idx = 0; idx < ingredientList.length; ++idx) {
      const group = ingredientList[idx];
      const change = changeList.find(c => c.ingredient === group.ingredient);

      if (!change) {
        continue;
      }

      const ingredientNum = new BN(idx);
      const [storeKey, storeBump] = storeKeysAndBumps[idx];
      const storeAccount = storeAccounts[idx];
      const walletATA = await getAssociatedTokenAccount(
        anchorWallet.publicKey, change.mint);
      if (change.operation === 'add') {
        if (storeAccount === null) {
          // nothing
        } else {
          throw new Error(`Ingredient ${group.ingredient} has already been added to this dish`);
        }

        // TODO: cache?
        const mintsKeys = group.mints.map(m => new PublicKey(m));
        const mintIdx = mintsKeys.findIndex(m => m.equals(change.mint));
        if (mintIdx === -1) {
          const changeMint = change.mint.toBase58();
          throw new Error(`Could not find mint matching ${changeMint} in ingredient group ${group.ingredient}`);
        }

        const tree = new MerkleTree(mintsKeys.map(m => m.toBuffer()));
        const proof = tree.getProof(mintIdx);

        setup.push(await program.instruction.addIngredient(
          storeBump,
          ingredientNum,
          proof,
          {
            accounts: {
              recipe: recipeKey,
              dish: dishKey,
              ingredientMint: change.mint,
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
      } else if (change.operation === 'recover') {
        if (storeAccount === null) {
          throw new Error(`Ingredient ${group.ingredient} is not in this dish`);
        }

        setup.push(await program.instruction.removeIngredient(
          storeBump,
          ingredientNum,
          {
            accounts: {
              dish: dishKey,
              ingredientMint: change.mint,
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
      } else {
        throw new Error(`Unknown change operation ${change.operation}`);
      }
    }

    console.log('Finished building instrs', getUnixTs() - startTime);

    if (setup.length === 0) {
      return;
    }

    console.log(setup);

    const instrsPerTx = 2; // TODO: adjust based on proof size...
    const chunked = chunks(setup, instrsPerTx);
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
          message: `Dish Changes succeeded: ${ind + 1} of ${chunked.length}`,
          description: (
            <HyperLink href={explorerLinkFor(txid, connection)}>
              View transaction on explorer
            </HyperLink>
          ),
        });
      },
      // failure callback
      (reason: string, ind: number) => {
        console.log(`Dish Changes failed on ${ind}: ${reason}`);
        return true;
      },
    );

    console.log(passed);

    if (passed !== chunked.length) {
      throw new Error(`One of the dish changes failed. See console logs`);
    }

    setIngredients(await getOnChainIngredients(
          connection, recipeKey, anchorWallet.publicKey, ingredientList));

    setRelevantMints(await getRelevantTokenAccounts(
          connection, anchorWallet.publicKey, ingredientList));

    setChangeList([]);
  };

  const claim = async (e : React.SyntheticEvent, masterMintKey : PublicKey) => {
    // TODO: less hacky. let the link click go through
    if ((e.target as any).href !== undefined) {
      return;
    } else {
      e.preventDefault();
    }

    if (!anchorWallet || !program) {
      throw new Error(`Wallet or program is not connected`);
    }

    const recipeKey = new PublicKey(recipe);
    const [dishKey, ] = await PublicKey.findProgramAddress(
      [
        FIREBALL_PREFIX,
        recipeKey.toBuffer(),
        anchorWallet.publicKey.toBuffer(),
      ],
      FIREBALL_PROGRAM_ID,
    );

    const [recipeMintOwner, recipeMintBump] = await PublicKey.findProgramAddress(
      [
        FIREBALL_PREFIX,
        recipeKey.toBuffer(),
      ],
      FIREBALL_PROGRAM_ID
    );

    const recipeATA = await getAssociatedTokenAccount(
        recipeMintOwner, masterMintKey);

    const newMint = Keypair.generate();
    const newMetadataKey = await getMetadata(newMint.publicKey);
    const masterMetadataKey = await getMetadata(masterMintKey);
    const newEdition = await getEdition(newMint.publicKey);
    const masterEdition = await getEdition(masterMintKey);

    const setup : Array<TransactionInstruction> = [];
    await createMintAndAccount(connection, anchorWallet.publicKey, newMint.publicKey, setup);

    const masterEditionAccount = await connection.getAccountInfo(masterEdition);
    if (masterEditionAccount === null) {
      throw new Error(`Could not retrieve master edition for mint ${masterMintKey.toBase58()}`);
    }
    const masterEditionDecoded = decodeMasterEdition(masterEditionAccount.data);

    // TODO: less naive?
    const masterEditionSupply = new BN(masterEditionDecoded.supply);
    const edition = masterEditionSupply.add(new BN(1));
    if (!masterEditionDecoded.maxSupply) {
      // no limit. try for next
    } else {
      const maxSupply = new BN(masterEditionDecoded.maxSupply);
      if (edition.gt(maxSupply)) {
        const masterMintStr = masterMintKey.toBase58();
        throw new Error(`No more editions remaining for ${masterMintStr}`);
      }
    }

    const editionMarkKey = await getEditionMarkerPda(masterMintKey, edition);

    setup.push(await program.instruction.makeDish(
      recipeMintBump,
      edition, // edition
      {
        accounts: {
          recipe: recipeKey,
          dish: dishKey,
          payer: anchorWallet.publicKey,
          metadataNewMetadata: newMetadataKey,
          metadataNewEdition: newEdition,
          metadataMasterEdition: masterEdition,
          metadataNewMint: newMint.publicKey,
          metadataEditionMarkPda: editionMarkKey,
          metadataNewMintAuthority: anchorWallet.publicKey,
          metadataMasterTokenOwner: recipeMintOwner,
          metadataMasterTokenAccount: recipeATA,
          metadataNewUpdateAuthority: anchorWallet.publicKey,
          metadataMasterMetadata: masterMetadataKey,
          metadataMasterMint: masterMintKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [],
        instructions: [],
      }
    ));

    console.log(setup);

    const claimResult = await Connection.sendTransactionWithRetry(
      program.provider.connection,
      anchorWallet,
      setup,
      [newMint],
    );

    console.log(claimResult);

    if (typeof claimResult === "string") {
      throw new Error(claimResult);
    } else {
      notify({
        message: "Claim succeeded",
        description: (
          <HyperLink href={explorerLinkFor(claimResult.txid, connection)}>
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
        sx={{ fontFamily: 'Monospace' }}
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

  const relevantImagesC = (
    relevant : Array<RelevantMint>,
    operation : IngredientView,
  ) => {
    return (
      <ImageList cols={3}>
        {relevant.map((r, idx) => {
          const inBatch = changeList.find(c => c.mint === r.mint && c.operation === operation);
          return (
            <HoverButton
              key={idx}
              padding={inBatch ? 10 : 0}
              disabled={false}
              handleClick={e => {
                setLoading(true);
                const wrap = async () => {
                  try {
                    if (inBatch) {
                      await cancelChangeForIngredient(e, r.ingredient);
                    } else if (operation === 'add') {
                      await addIngredient(e, r.ingredient, r.mint);
                    } else if (operation === 'recover') {
                      await recoverIngredient(e, r.ingredient);
                    } else {
                      // TODO: error earlier...
                      throw new Error(`Unknown operation ${operation}`);
                    }
                    setLoading(false);
                  } catch (err) {
                    notify({
                      message: `${inBatch ? 'Cancel of ' : ''} ${capitalize(operation)} ingredient failed`,
                      description: `${err}`,
                    });
                    setLoading(false);
                  }
                };
                wrap();
              }}
              hoverDisplay={(
                <React.Fragment>
                  <div style={{ fontSize: "1.5rem" }}>{r.name}</div>
                  <div>Ingredient: {r.ingredient}</div>
                  <div>{explorerLinkForAddress(r.mint)}</div>
                </React.Fragment>
              )}
            >
              <ImageListItem>
                <LoadingImage
                  url={r.image}
                />
              </ImageListItem>
            </HoverButton>
          );
        })}
      </ImageList>
    );
  };

  const dishSelectionButtonsC = (onClick) => {
    return (
      <React.Fragment>

        <Box sx={{ position: "relative" }}>
        <Button
          disabled={
            !anchorWallet
            || loading
            || changeList.length === 0
          }
          variant="contained"
          style={{ width: "100%" }}
          onClick={(e) => {
            setLoading(true);
            const wrap = async () => {
              try {
                await submitDishChanges(e);
                setLoading(false);
              } catch (err) {
                console.log(err);
                notify({
                  message: `Dish Changes failed`,
                  description: err.message,
                });
                setLoading(false);
              }
            };
            wrap();
          }}
        >
          {ingredientView === IngredientView.add
            ? 'Add Ingredients'
            : 'Recover Ingredients'}
        </Button>
        {loading && loadingProgress()}
        </Box>

        <Button
          disabled={
            !anchorWallet
            || loading
            || dishIngredients.length !== ingredientList.length
          }
          variant="contained"
          style={{ width: "100%" }}
          onClick={() => {
            onClick();
            // TODO: should we requery recipe yields?
            // setRecipeYields(await getRecipeYields(connection, recipeKey));
          }}
        >
          Next
        </Button>
      </React.Fragment>
    );
  };

  const recipeYieldsC = (
    params : {
      cols: number,
      canClaim?: boolean,
      shortenAddress?: boolean,
    }
  ) => {
    // TODO: hover to claim and handle onClick?
    return (
      <ImageList cols={params.cols}>
        {recipeYields.map((r, idx) => {
          return (
            <HoverButton
              key={idx}
              padding={0}
              disabled={false}
              handleClick={e => {
                if (!params.canClaim) return;
                setLoading(true);
                const wrap = async () => {
                  try {
                    await claim(e, r.mint);
                    setLoading(false);
                  } catch (err) {
                    notify({
                      message: `Claim failed`,
                      description: `${err}`,
                    });
                    setLoading(false);
                  }
                };
                wrap();
              }}
              hoverDisplay={(
                <React.Fragment>
                  {params.canClaim && <Box sx={{fontSize: "2rem"}}>
                    Claim!
                  </Box>}
                  <div style={{ fontSize: "1.5rem" }}>{r.name}</div>
                  <div>
                    {!isNaN(r.remaining) && `Remaining: ${r.remaining}`}
                  </div>
                  {explorerLinkForAddress(r.mint, params.shortenAddress)}
                </React.Fragment>
              )}
            >
              <ImageListItem key={idx}>
                <LoadingImage
                  url={r.image}
                />
              </ImageListItem>
            </HoverButton>
          );
        })}
      </ImageList>
    );
  };

  React.useEffect(() => {
    setLoading(true);
    try {
      const recipeKey = new PublicKey(recipe);
      const wrap = async () => {
        try {
          setRecipeYields(await getRecipeYields(connection, recipeKey));
        } catch (err) {
          console.log('Fetch yield preview err', err);
        }
        setLoading(false);
      };
      wrap();
    } catch (err) {
      setRecipeYields([]);
      console.log('Key decode err', err);
      setLoading(false);
    }
  }, [recipe]);

  const recipeFieldC = (disabled : boolean) => {
    return (
      <TextField
        id="recipe-field"
        label={`Recipe`}
        value={recipe}
        inputProps={{
          sx: { fontFamily: 'Monospace' }
        }}
        disabled={disabled}
        onChange={e => setRecipe(e.target.value)}
      />
    );
  };

  const chooseRecipeC = (onClick) => {
    return (
      <React.Fragment>
        {recipeFieldC(false)}
        <Box sx={{ position: "relative" }}>
        <Button
          disabled={!anchorWallet || loading}
          variant="contained"
          color="primary"
          style={{ width: "100%" }}
          onClick={() => {
            setLoading(true);
            const wrap = async () => {
              try {
                // TODO: race condition between setting and clicking...
                const key = new PublicKey(recipe);
                await fetchRelevantMints(key);
                setLoading(false);
                onClick();
              } catch (err) {
               notify({
                  message: 'Fetch relevant mints failed',
                  description: `${err}`,
                });
                setLoading(false);
              }
            };
            wrap();
          }}
        >
          Next
        </Button>
        {loading && loadingProgress()}
        </Box>
        {recipeYieldsC({cols: 1, shortenAddress: true})}
      </React.Fragment>
    );
  };

  // TODO: delay until ingredients is non-empty?
  const selectIngredientsC = (onClick) => {
    const operatingList = ingredientView === IngredientView.add
      ? relevantMints
      : dishIngredients;
    return (
      <React.Fragment>
        {recipeFieldC(true)}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={ingredientView == IngredientView.add ? 0 : 1}
            onChange={(e, newValue) => {
              switch (newValue) {
                case 0: {
                  setChangeList([]);
                  setIngredientView(IngredientView.add);
                  break;
                }
                case 1: {
                  setChangeList([]);
                  setIngredientView(IngredientView.recover);
                  break;
                }
                default: {
                  throw new Error(`Invalid view value ${newValue}`);
                }
              }
            }}
          >
            <Tab label="Wallet" />
            <Tab label="Dish" />
          </Tabs>
        </Box>
          <Button
            disabled={!anchorWallet || loading}
            //variant="contained"
            style={{ width: "100%" }}
            onClick={() => {
              try {
                const uniqIngredients = operatingList.reduce(
                  (acc, m) => {
                    const ingredientStr = m.ingredient;
                    if (ingredientStr in acc) return acc;
                    if (ingredientView === IngredientView.add
                        && dishIngredients.find(c => c.ingredient === ingredientStr)) {
                      return acc;
                    }
                    return {
                      ...acc,
                      [ingredientStr]: {
                        ingredient: m.ingredient,
                        mint: m.mint,
                        operation: ingredientView,
                      },
                    };
                  },
                  {}
                );
                setChangeList(Object.values(uniqIngredients));
              } catch (err) {
                notify({
                  message: `Select Ingredients Failed`,
                  description: `${err}`,
                });
              }
            }}
          >
            {ingredientView === IngredientView.add
              ? 'Select New Ingredients'
              : 'Select All Ingredients'
            }
          </Button>
        {relevantImagesC(operatingList, ingredientView)}
        {dishSelectionButtonsC(onClick)}
      </React.Fragment>
    );
  };

  const selectYieldC = () => {
    return (
      <React.Fragment>
        {recipeFieldC(true)}
        {recipeYieldsC({cols: 1, canClaim: true, shortenAddress: false})}
      </React.Fragment>
    );
  };

  const steps = [
    { name: "Choose Recipe"      , inner: chooseRecipeC      } ,
    { name: "Select Ingredients" , inner: selectIngredientsC } ,
    { name: "Select Yield"       , inner: selectYieldC       } ,
  ];

  const [activeStep, setActiveStep] = React.useState(0);
  const stepToUse = Math.min(activeStep, steps.length - 1);

  const handleNext = () => {
    // return to start if going past the end (claim succeeded)
    setActiveStep(prev => {
      if (prev === steps.length - 1) {
        return 0;
      } else {
        return prev + 1;
      }
    });
  };
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const stepper = (
    <React.Fragment>
      <Stepper activeStep={stepToUse}>
        {steps.map(s => {
          return (
            <Step key={s.name}>
              <StepLabel>{s.name}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <Box />
    </React.Fragment>
  );

  return (
    <Stack spacing={2}>
      {stepper}
      {steps[stepToUse].inner(handleNext)}
      {stepToUse > 0 && (
        <Button
          color="info"
          onClick={handleBack}
        >
          Back
        </Button>
      )}
    </Stack>
  );
};
