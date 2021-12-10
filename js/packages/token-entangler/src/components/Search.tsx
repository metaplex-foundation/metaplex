import { Box, Button, FormGroup, TextField } from "@mui/material";
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
import { searchEntanglements } from "../utils/entangler";


export const Search = () => {
    const connection = useConnection();
    console.log(connection);
    const wallet = useWallet();
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
        const res = await searchEntanglements(anchorWallet, connection, mintA);

        console.log(res);
    };

    const [mintA, setMintA] = React.useState(localStorage.getItem("mintA") || "");
    return (
        <React.Fragment>
            <h1>Search Entanglements</h1>
            <p>Search for entanglements by mint address</p>

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
                    onChange={(e) => {
                        localStorage.setItem("mintA", e.target.value);
                        setMintA(e.target.value);
                    }}
                />
                <FormGroup>
                    <Button variant="contained" onClick={async (e) => await handleSubmit(e)} endIcon={<SearchIcon />}>
                        Search Entanglements
                    </Button>
                </FormGroup>

            </Box>
        </React.Fragment>
    );

}