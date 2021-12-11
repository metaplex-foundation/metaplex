import { Box, Button, FormGroup } from "@mui/material";
import React from "react";
import SearchIcon from '@mui/icons-material/Search';
import {
    useConnection,
} from "../contexts";

import { useMemo } from 'react';
import {
    useWallet,
} from "@solana/wallet-adapter-react";

import * as anchor from '@project-serum/anchor';
import { getOwnedNFTMints } from "../utils/entangler";


export const Wizard = () => {
    const connection = useConnection();
    console.log(connection);
    const wallet = useWallet();
    const [mints, setMints] = React.useState<Array<string>>([]);

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

    const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!anchorWallet) {
            return;
        }
        const res = await getOwnedNFTMints(anchorWallet, connection);
        const mintsFounded = res.map((token) => (token.info.mint));
        setMints([...mintsFounded]);
    };


    return (
        <React.Fragment>
            <h1>Search my mints</h1>
            <p>Search for entanglements by owner address</p>

            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                <FormGroup>
                    <Button variant="contained" onClick={async (e) => await handleSubmit(e)} endIcon={<SearchIcon />}>
                        Search Tokens
                    </Button>
                </FormGroup>

            </Box>
            <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
                <h2>Mint List</h2>
                {mints.map((mint) => (<li key={mint}>{mint}</li>))}
            </Box>
        </React.Fragment>
    );

}