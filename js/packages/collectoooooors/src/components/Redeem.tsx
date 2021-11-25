import React from "react";

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link as HyperLink,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  List,
  ListItem,
  TextField,
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

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
  decodeMetadata,
  notify,
  shortenAddress,
  useLocalStorageState,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@oyster/common';
import {
  useWallet,
} from '@solana/wallet-adapter-react';
import BN from 'bn.js';

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
  COLLECTOOOOOORS_PREFIX,
  COLLECTOOOOOORS_PROGRAM_ID,
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


const createMintAndAccount = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  mint : PublicKey,
  setup : Array<TransactionInstruction>,
) => {
  const [walletTokenKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );

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

type Ingredient = {
  mint: PublicKey,
};

const fetchMintAndImage = async (
  connection : RPCConnection,
  mintKey : PublicKey
) : Promise<MintAndImage | null> => {
  const metadataKey = await getMetadata(mintKey);
  const metadataAccount = await connection.getAccountInfo(metadataKey);
  if (metadataAccount === null) {
    notify({
      message: 'Fetch mint failed',
      description: `Could not fetch metadata for mint ${mintKey.toBase58()}`,
    });
    return null;
  }
  const metadata = decodeMetadata(metadataAccount.data);
  const schema = await (await fetch(metadata.data.uri)).json();

  console.log(schema);

  return {
    mint: mintKey,
    name: metadata.data.name,
    image: schema.image,
  };
};

const getRecipeYields = async (
  connection : RPCConnection,
  recipeKey : PublicKey,
) => {
  const [recipeMintOwner, ] = await PublicKey.findProgramAddress(
    [
      COLLECTOOOOOORS_PREFIX,
      recipeKey.toBuffer(),
    ],
    COLLECTOOOOOORS_PROGRAM_ID
  );

  const yieldsAccounts = await connection.getTokenAccountsByOwner(
      recipeMintOwner,
      { programId: TOKEN_PROGRAM_ID },
    );
  const yieldsDecoded = yieldsAccounts.value.map(v => AccountLayout.decode(v.account.data));
  const yieldImages : Array<MintAndImage> = [];
  for (const r of yieldsDecoded) {
    const hasToken = new BN(r.amount, 'le').toNumber() > 0;
    if (!hasToken) {
      continue;
    }
    const res = await fetchMintAndImage(connection, new PublicKey(r.mint));
    if (res !== null) {
      yieldImages.push(res);
    }
  }
  return yieldImages;
};

const getOnChainIngredients = async (
  connection : RPCConnection,
  recipeKey : PublicKey,
  walletKey : PublicKey,
  ingredientList : Array<any>,
) => {
  const [dishKey, ] = await PublicKey.findProgramAddress(
    [
      COLLECTOOOOOORS_PREFIX,
      recipeKey.toBuffer(),
      walletKey.toBuffer(),
    ],
    COLLECTOOOOOORS_PROGRAM_ID,
  );

  const ingredients = {};
  for (let idx = 0; idx < ingredientList.length; ++idx) {
    const group = ingredientList[idx];
    const ingredientNum = new BN(idx);
    const [storeKey, ] = await PublicKey.findProgramAddress(
      [
        COLLECTOOOOOORS_PREFIX,
        dishKey.toBuffer(),
        Buffer.from(ingredientNum.toArray('le', 8)),
      ],
      COLLECTOOOOOORS_PROGRAM_ID,
    );

    const storeAccount = await connection.getAccountInfo(storeKey);
    if (storeAccount !== null) {
      const currentStore = AccountLayout.decode(Buffer.from(storeAccount.data));
      ingredients[group.ingredient] = {
        mint: new PublicKey(currentStore.mint),
      };
    } else {
      ingredients[group.ingredient] = null;
    }
  }

  return ingredients;
};

const getRelevantTokenAccounts = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  ingredientList : Array<any>,
) => {
  const mints = {};
  for (const group of ingredientList)
    for (const mint of group.mints)
      mints[mint] = group.ingredient;

  const owned = await connection.getTokenAccountsByOwner(
      walletKey,
      { programId: TOKEN_PROGRAM_ID },
    );

  const decoded = owned.value.map(v => AccountLayout.decode(v.account.data));
  console.log(decoded);
  const relevant = decoded.filter(a => {
    const mintMatches = (new PublicKey(a.mint).toBase58()) in mints;
    const hasToken = new BN(a.amount, 'le').toNumber() > 0;
    return mintMatches && hasToken;
  });

  // TODO: getMultipleAccounts
  const relevantImages : Array<RelevantMint> = [];
  for (const r of relevant) {
    const res = await fetchMintAndImage(connection, new PublicKey(r.mint));
    if (res !== null) {
      relevantImages.push({
        ...res,
        ingredient: mints[res.mint.toBase58()],
      });
    }
  }
  return relevantImages;
};

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

  const [recipeYields, setRecipeYields] = React.useState<Array<MintAndImage>>([]);
  const [relevantMints, setRelevantMints] = React.useState<Array<RelevantMint>>([]);
  const [ingredientList, setIngredientList] = React.useState<Array<any>>([]);
  const [ingredients, setIngredients] = React.useState<{ [key: string]: (Ingredient | null) }>({});
  const [changeList, setChangeList] = React.useState<Array<any>>([]);

  // TODO: on page load also
  const fetchRelevantMints = async (recipeKey : PublicKey) => {
    if (!anchorWallet || !program) {
      return;
    }

    let recipe;
    try {
      recipe = await program.account.recipe.fetch(recipeKey);
    } catch (err) {
      throw new Error(`Failed to find recipe ${recipeKey.toBase58()}`);
    }

    const ingredientUrl = recipe.ingredients.replace(/\0/g, '');
    const ingredientList = await (await fetch(ingredientUrl)).json();

    if (recipe.roots.length !== ingredientList.length) {
      throw new Error(`Recipe has a different number of ingredient lists and merkle hashes. Bad configuration`);
    }

    // cache for later...
    setIngredientList(ingredientList);

    setIngredients(await getOnChainIngredients(
          connection, recipeKey, anchorWallet.publicKey, ingredientList));

    setRelevantMints(await getRelevantTokenAccounts(
          connection, anchorWallet.publicKey, ingredientList));
  };

  const addIngredient = async (e : React.SyntheticEvent, ingredient: string, mint: PublicKey) => {
    // TODO: less hacky. let the link click go through
    if ((e.target as any).href !== undefined) {
      return;
    } else {
      e.preventDefault();
    }

    if (ingredients[ingredient] !== null) {
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
            operation: 'add',
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

    const mint = ingredients[ingredient];
    if (mint === null) {
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
            operation: 'recover',
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
      const change = changeList.find(c => c.ingredient === group.ingredient);

      if (!change) {
        continue;
      }

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
      const walletATA = await getAssociatedTokenAccount(
        anchorWallet.publicKey, change.mint, connection);
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

    setIngredients(await getOnChainIngredients(
          connection, recipeKey, anchorWallet.publicKey, ingredientList));

    setRelevantMints(await getRelevantTokenAccounts(
          connection, anchorWallet.publicKey, ingredientList));

    setChangeList([]);
  };

  const claim = async (e : React.SyntheticEvent) => {
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

    const masterMintKey = new PublicKey('2fLzRZkLj5ED5ZBCeyiUKuHuJ5MRT7fGLcbSQfbW1uEX');

    const [recipeMintOwner, recipeMintBump] = await PublicKey.findProgramAddress(
      [
        COLLECTOOOOOORS_PREFIX,
        recipeKey.toBuffer(),
      ],
      COLLECTOOOOOORS_PROGRAM_ID
    );

    const [recipeATA, ] = await PublicKey.findProgramAddress(
      [
        recipeMintOwner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        masterMintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const newMint = Keypair.generate();
    const newMetadataKey = await getMetadata(newMint.publicKey);
    const masterMetadataKey = await getMetadata(masterMintKey);
    const newEdition = await getEdition(newMint.publicKey);
    const masterEdition = await getEdition(masterMintKey);

    const setup : Array<TransactionInstruction> = [];
    await createMintAndAccount(connection, anchorWallet.publicKey, newMint.publicKey, setup);

    const edition = new BN(0);
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

  const relevantImagesC = () => {
    return (
      <ImageList cols={2}>
        {relevantMints.map((r, idx) => {
          const inBatch = changeList.find(c => c.mint === r.mint && c.operation === 'add');
          return (
            <HoverButton
              padding={inBatch ? 10 : 0}
              key={idx}
              handleClick={e => {
                setLoading(true);
                const wrap = async () => {
                  try {
                    inBatch
                      ? await cancelChangeForIngredient(e, r.ingredient)
                      : await addIngredient(e, r.ingredient, r.mint);
                    setLoading(false);
                  } catch (err) {
                    notify({
                      message: `${inBatch ? 'Cancel of Add': 'Add'} ingredient failed`,
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
                <img
                  src={r.image}
                  alt={r.name}
                />
              </ImageListItem>
            </HoverButton>
          );
        })}
      </ImageList>
    );
  };

  const dishSelectionC = () => {
    return (
      <React.Fragment>
        <List>
          {Object.keys(ingredients).map((ingredient, idx) => {
            const mint = ingredients[ingredient];
            const inBatch = changeList.find(c => c.mint === mint?.mint && c.operation === 'recover');
            return (
              <ListItem key={idx}>
                <Stack spacing={0}>
                  <div>
                    {ingredient}
                  </div>
                  <div>
                    {mint
                      ? (
                        <React.Fragment>
                          {explorerLinkForAddress(mint.mint, false)}
                          <IconButton
                            style={{marginLeft: 6}}
                            onClick={e => {
                              setLoading(true);
                              const wrap = async () => {
                                try {
                                  inBatch
                                    ? await cancelChangeForIngredient(e, ingredient)
                                    : await recoverIngredient(e, ingredient);
                                  setLoading(false);
                                } catch (err) {
                                  notify({
                                    message: `${inBatch ? 'Cancel of Recover': 'Recover'} ingredient failed`,
                                    description: `${err}`,
                                  });
                                  setLoading(false);
                                }
                              };
                              wrap();
                            }}
                          >
                            {inBatch ? <CancelIcon /> : <RemoveCircleIcon />}
                          </IconButton>
                        </React.Fragment>
                      )
                      : (
                        <Box sx={{fontFamily: 'Monospace'}}>
                          {'\u00A0'.repeat(60)}
                        </Box>
                      )
                    }
                  </div>
                </Stack>
              </ListItem>
            );
          })}
        </List>
      </React.Fragment>
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
        </Button>
        {loading && loadingProgress()}
        </Box>

        <Box sx={{ position: "relative" }}>
        <Button
          disabled={
            !anchorWallet
            || loading
            || Object.values(ingredients).some(x => x === null)
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
        {loading && loadingProgress()}
        </Box>
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
            <ImageListItem key={idx}>
              <img
                src={r.image}
                alt={r.name}
              />
              <ImageListItemBar
                title={`${r.name}`}
                subtitle={explorerLinkForAddress(r.mint, params.shortenAddress)}
                actionIcon={
                  (() => {
                    if (!params.canClaim) return null;
                    // TODO: check that PDA also doesn't exist
                    return (
                      <IconButton
                        onClick={e => {
                          setLoading(true);
                          const wrap = async () => {
                            try {
                              await claim(e);
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
                      >
                        <AddIcon />
                      </IconButton>
                    );
                  })()
                }
              />
            </ImageListItem>
          );
        })}
      </ImageList>
    );
  };

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
        onChange={e => {
          setLoading(true);
          setRecipe(e.target.value)
          try {
            const recipeKey = new PublicKey(e.target.value);
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
        }}
      />
    );
  };

  const chooseRecipeC = (onClick) => {
    return (
      <React.Fragment>
        {recipeFieldC(false)}
        {recipeYieldsC({cols: 3, shortenAddress: true})}
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
      </React.Fragment>
    );
  };

  // TODO: delay until ingredients is non-empty?
  const selectIngredientsC = (onClick) => {
    return (
      <React.Fragment>
        {recipeFieldC(true)}
        {dishSelectionC()}
        {relevantImagesC()}
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
