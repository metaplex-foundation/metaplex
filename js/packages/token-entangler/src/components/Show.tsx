import React from 'react';
import { useConnection } from '../contexts';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useEffect } from 'react';
import * as anchor from '@project-serum/anchor';
import { showEntanglement } from '../utils/entangler';
import { Box, Button, FormGroup, TextField } from '@mui/material';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export const Show = () => {
  const connection = useConnection();
  const wallet = useWallet();

  const [mintA, setMintA] = React.useState(localStorage.getItem('mintA') || '');
  const [mintB, setMintB] = React.useState(localStorage.getItem('mintB') || '');
  const [entangledPair, setEntangledPair] = React.useState(
    localStorage.getItem('entangledPair') || '',
  );
  const [entangledPairInfo, setEntangledPairInfo] = React.useState({});

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

  const displayEntanglement = (e: any) => {
    return (
      <Card
        sx={{ minWidth: 275, boxShadow: 3, mb: 3 }}
        key={e.mintA.toString()}
      >
        <CardContent>
          <Typography sx={{ fontSize: 19 }} component="div" gutterBottom>
            <strong>Entanglement Info</strong>
          </Typography>
          {displayEntanglementContent(e)}
        </CardContent>
      </Card>
    );
  };

  const displayEntanglementContent = (e: any) => {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        key={e.mintB.toString()}
        gutterBottom
      >
        <strong>Treasury Mint</strong> : {e.treasuryMint} <br />
        <strong>Authority</strong> : {e.authority} <br />
        <strong>Mint A</strong> : {e.mintA} <br />
        <strong>Mint B</strong> : {e.mintB} <br />
        <strong>Token A Escrow</strong> : {e.tokenAEscrow} <br />
        <strong>Token B Escrow</strong> : {e.tokenBEscrow} <br />
        <strong>Price</strong> : {e.price} <br />
        <strong>Paid At Least Once</strong> : {e.paid} <br />
        <strong>Paid Every Time</strong> : {e.paysEveryTime} <br />
        <strong>Bump</strong> : {e.bump} <br />
      </Typography>
    );
  };

  const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (!anchorWallet) {
      return;
    }
    try {
      const epObj: any = await showEntanglement(
        anchorWallet,
        connection,
        entangledPair,
        mintA,
        mintB,
      );
      const info = {
        treasuryMint: epObj.treasuryMint.toBase58(),
        authority: epObj.authority.toBase58(),
        mintA: epObj.mintA.toBase58(),
        mintB: epObj.mintB.toBase58(),
        tokenAEscrow: epObj.tokenAEscrow.toBase58(),
        tokenBEscrow: epObj.tokenBEscrow.toBase58(),
        price: epObj.price.toNumber(),
        paid: epObj.paid.toString(),
        paysEveryTime: epObj.paysEveryTime.toString(),
        bump: epObj.bump,
      };

      setEntangledPairInfo(info);
    } catch (e) {
      // TODO Show Error
      if (e instanceof Error) {
        console.error(e.message);
      }
    }
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
        Show Entanglement
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
            Show Entanglement
          </Button>
        </FormGroup>
        {!isEnable(mintA, mintB, entangledPair) && (
          <Alert severity="warning" style={{ marginTop: '1rem' }}>
            <AlertTitle>Warning</AlertTitle>
            The three input are filled. You should enter MintA and MintB or
            Entangled Pair.
          </Alert>
        )}
      </Box>
      <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
        {Object.keys(entangledPairInfo).length > 0 &&
          displayEntanglement(entangledPairInfo)}
      </Box>
    </React.Fragment>
  );
};
