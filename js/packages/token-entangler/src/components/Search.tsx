import { Box, Button, FormGroup, TextField } from '@mui/material';
import React, { useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { useConnection } from '../contexts';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import * as anchor from '@project-serum/anchor';
import { searchEntanglements } from '../utils/entangler';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export const Search = () => {
  const connection = useConnection();
  console.log(connection);
  const wallet = useWallet();
  const [entangledPairs, setEntangledPairs] = React.useState<Array<any>>([]);

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
      setAuthority(anchorWallet.publicKey.toString());
    })();
  }, [anchorWallet]);

  const displayEntanglements = (e: any) => {
    return (
      <Card
        sx={{ minWidth: 275, boxShadow: 3, mb: 3 }}
        key={e.mintA.toString()}
      >
        <CardContent>
          <Typography sx={{ fontSize: 19 }} component="div" gutterBottom>
            <strong>{e.mintB}</strong>
          </Typography>
          {displayEntangledPairContent(e)}
        </CardContent>
      </Card>
    );
  };

  const displayEntangledPairContent = (e: any) => {
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
    const { entanglements: foundEntanglements } = await searchEntanglements(
      anchorWallet,
      connection,
      mintA,
      authority,
    );
    const entanglements = foundEntanglements.map((entanglement: any) => ({
      treasuryMint: entanglement.treasuryMint.toBase58(),
      authority: entanglement.authority.toBase58(),
      mintA: entanglement.mintA.toBase58(),
      mintB: entanglement.mintB.toBase58(),
      tokenAEscrow: entanglement.tokenAEscrow.toBase58(),
      tokenBEscrow: entanglement.tokenBEscrow.toBase58(),
      price: entanglement.price.toNumber(),
      paid: entanglement.paid.toString(),
      paysEveryTime: entanglement.paysEveryTime.toString(),
      bump: entanglement.bump,
    }));
    setEntangledPairs(entanglements);
  };

  const [mintA, setMintA] = React.useState(localStorage.getItem('mintA') || '');
  const [authority, setAuthority] = React.useState(
    localStorage.getItem('authority') || '',
  );

  return (
    <React.Fragment>
      <Typography variant="h4" color="text.primary" gutterBottom>
        Search Entanglements
      </Typography>
      <p>Search for entanglements by mint address and authority</p>

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
          id="mintA-text-field"
          label="Authority"
          value={authority}
          onChange={e => {
            localStorage.setItem('authority', e.target.value);
            setAuthority(e.target.value);
          }}
        />
        <FormGroup>
          <Button
            disabled={!authority || !mintA}
            variant="contained"
            onClick={async e => await handleSubmit(e)}
            endIcon={<SearchIcon />}
          >
            Search Entanglements
          </Button>
        </FormGroup>
        <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
          <Typography variant="h5" color="text.primary" gutterBottom>
            Entanglements
          </Typography>
        </Box>
      </Box>
      <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
        {entangledPairs.map((e: any) => displayEntanglements(e))}
      </Box>
    </React.Fragment>
  );
};
