import React from "react";
import {
    useConnection,
} from "../contexts";
import {
    useWallet,
} from "@solana/wallet-adapter-react";
import { useMemo, useEffect } from 'react';
import * as anchor from '@project-serum/anchor';
import { loadTokenEntanglementProgram, swapEntanglement } from "../utils/entangler";
import { Box, Button, FormGroup, TextField } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';

export const Swap = () => {
    const connection = useConnection();
    const wallet = useWallet();

    const [mintA, setMintA] = React.useState(localStorage.getItem("mintA") || "");
    const [mintB, setMintB] = React.useState(localStorage.getItem("mintB") || "");
    const [entangledPair, setEntangledPair] = React.useState(localStorage.getItem("entangledPair") || "");

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
            const anchorProgram = loadTokenEntanglementProgram(
                anchorWallet,
                connection,
            );
            console.log(anchorProgram);

        })()
    }, [
        anchorWallet,
    ]);

    const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!anchorWallet) {
            return;
        }
        const txnResult = await swapEntanglement(anchorWallet, connection, mintA, mintB, entangledPair);
        console.log(txnResult);
    }


    return (
        <React.Fragment>
            <h1>Swap Entanglement</h1>

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
                <TextField
                    id="mintB-text-field"
                    label="MintB"
                    value={mintB}
                    onChange={(e) => {
                        localStorage.setItem("mintB", e.target.value);
                        setMintB(e.target.value);
                    }}
                />
                <TextField
                    id="price-text-field"
                    helperText="Entangled pair"
                    label="Entangled pair"
                    value={entangledPair}
                    onChange={(e) => {
                        localStorage.setItem("entangledPair", e.target.value);
                        setEntangledPair(e.target.value);
                    }}
                />
                <FormGroup>
                    <Button variant="contained" onClick={async (e) => await handleSubmit(e)} endIcon={<SendIcon />}>
                        Swap
                    </Button>
                </FormGroup>
            </Box>


        </React.Fragment>
    );
};