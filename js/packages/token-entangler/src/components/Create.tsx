import { Button, Checkbox, FormControlLabel, FormGroup, TextField } from "@mui/material";
import Box from '@mui/material/Box';
import SendIcon from '@mui/icons-material/Send';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { useMemo, useEffect } from 'react';


import {
    useWallet,
} from "@solana/wallet-adapter-react";
import React from "react";
import * as anchor from '@project-serum/anchor';

import {
    useConnection,
} from "../contexts";
import { createEntanglement } from "../utils/entangler";

export const Create = () => {
    const connection = useConnection();
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

    const [mintA, setMintA] = React.useState(localStorage.getItem("mintA") || "");
    const [mintB, setMintB] = React.useState(localStorage.getItem("mintB") || "");
    const [price, setPrice] = React.useState(localStorage.getItem("price") || "");
    const [paysEveryTime, setPaysEveryTime] = React.useState(false);
    const [authority, setAuthority] = React.useState(localStorage.getItem("authority") || "");

    useEffect(() => {
        (async () => {
            if (!anchorWallet) {
                return;
            }
            setAuthority(anchorWallet.publicKey.toString())

        })()
    }, [
        anchorWallet,
    ]);



    const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!anchorWallet) {
            return;
        }
        const res = await createEntanglement(anchorWallet, connection, null, authority, paysEveryTime, price, mintA, mintB);
        console.log(res);
    };

    const isEnable = (mintA: string, mintB: string, authority: string, price: string): boolean => {
        return (
            // eslint-disable-next-line no-extra-boolean-cast
            !!mintA && !!mintB && !!price && !!authority
        )
    }

    return (
        <React.Fragment>
            <Typography variant="h4" color="text.primary" gutterBottom >Create Entanglement</Typography>
            <p>
                Create an entanglement between two NFTs. Using connected wallet as entanglement authority.
            </p>

            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                <TextField
                    required
                    id="mintA-text-field"
                    label="MintA"
                    helperText="You do not even need to own this token to create this entanglement."
                    value={mintA}
                    onChange={(e) => {
                        localStorage.setItem("mintA", e.target.value);
                        setMintA(e.target.value);
                    }}
                />
                <TextField
                    required
                    id="mintB-text-field"
                    label="MintB"
                    helperText="This token will be removed from your token account right now."
                    value={mintB}
                    onChange={(e) => {
                        localStorage.setItem("mintB", e.target.value);
                        setMintB(e.target.value);
                    }}
                />
                <TextField
                    required
                    id="authority-text-field"
                    label="Authority"
                    helperText="Entanglement Authority"
                    value={authority}
                    onChange={(e) => {
                        localStorage.setItem("authority", e.target.value);
                        setAuthority(e.target.value);
                    }}
                />
                <TextField
                    required
                    id="price-text-field"
                    helperText="Price for a swap"
                    label="Price"
                    value={price}
                    onChange={(e) => {
                        localStorage.setItem("price", e.target.value);
                        setPrice(e.target.value);
                    }}
                />
                <FormGroup>
                    <FormControlLabel control={<Checkbox checked={paysEveryTime} onChange={(e) => { setPaysEveryTime(e.target.checked) }} />} label="Pay the swapping fee each swap" />
                </FormGroup>
                <FormGroup>
                    <Button
                        variant="contained"
                        onClick={async (e) => await handleSubmit(e)}
                        endIcon={<SendIcon />}
                        disabled={!isEnable(mintA, mintB, price, authority)}
                    >
                        Entangle
                    </Button>
                </FormGroup>
                { !isEnable(mintA, mintB, price, authority) && 
                    <Alert severity="warning" style={{ marginTop: "1rem" }}>
                        <AlertTitle>Warning</AlertTitle>
                        You should fill the four inputs.
                    </Alert>
                }

            </Box>


        </React.Fragment>
    )

}