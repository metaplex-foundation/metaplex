import React from 'react';
import { useConnection } from '../contexts';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useEffect } from 'react';
import * as anchor from '@project-serum/anchor';
import { swapEntanglement } from '../utils/entangler';
import { Box, Button, FormGroup, TextField } from '@mui/material';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';

export const Swap = () => {
  const connection = useConnection();
  const wallet = useWallet();

  const [mintA, setMintA] = React.useState(localStorage.getItem('mintA') || '');
  const [mintB, setMintB] = React.useState(localStorage.getItem('mintB') || '');
  const [entangledPair, setEntangledPair] = React.useState(
    localStorage.getItem('entangledPair') || '',
  );

  const anchorWallet = useMemo(() => {
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

  useEffect(() => {
    (async () => {
      if (!anchorWallet) {
        return;
      }
    })();
  }, [anchorWallet]);

  const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (!anchorWallet) {
      return;
    }
    const txnResult = await swapEntanglement(
      anchorWallet,
      connection,
      mintA,
      mintB,
      entangledPair,
    );
    setEntangledPair(txnResult.epkey);
  };

  const isEnable = (
    mintA: string,
    mintB: string,
    entangledPair: string,
  ): boolean => {
    return (
      // eslint-disable-next-line no-extra-boolean-cast
      (!!mintA && !!mintB && !!!entangledPair) ||
      (!(!!mintA || !!mintB) && !!entangledPair)
    );
  };

  return (
    <React.Fragment>
      <Typography variant="h4" color="text.primary" gutterBottom>
        Swap Entanglement
      </Typography>
      <p>Enter MintA and MintB or Entangled Pair.</p>

      <Box
        component="form"
        sx={{
          '& .MuiTextField-root': { m: 1, width: '25ch' },
        }}
        noValidate
        autoComplete="off"
      >
        <TextField
          id="mintA-text-field"
          label="MintA"
          value={mintA}
          onChange={e => {
            localStorage.setItem('mintA', e.target.value);
            setMintA(e.target.value);
          }}
        />
        <TextField
          id="mintB-text-field"
          label="MintB"
          value={mintB}
          onChange={e => {
            localStorage.setItem('mintB', e.target.value);
            setMintB(e.target.value);
          }}
        />
        <TextField
          id="price-text-field"
          helperText="Entangled pair"
          label="Entangled pair"
          value={entangledPair}
          onChange={e => {
            localStorage.setItem('entangledPair', e.target.value);
            setEntangledPair(e.target.value);
          }}
        />

        <FormGroup>
          <Button
            variant="contained"
            onClick={async e => await handleSubmit(e)}
            endIcon={<SendIcon />}
            disabled={!isEnable(mintA, mintB, entangledPair)}
          >
            Swap
          </Button>
        </FormGroup>
      </Box>

      <Box component="span" sx={{ display: 'block', marginTop: '2rem' }}>
        {!entangledPair ? (
          ''
        ) : (
          <Typography variant="h5" color="text.primary" gutterBottom>
            Entangled Pair swap complete!
          </Typography>
        )}
        <p>{entangledPair}</p>
      </Box>
    </React.Fragment>
  );
};
