import React from "react";
import {
    useConnection,
} from "../contexts";
import {
    useWallet,
} from "@solana/wallet-adapter-react";
import { useMemo, useEffect } from 'react';
import * as anchor from '@project-serum/anchor';
import { showEntanglement } from "../utils/entangler";
import { Box, Button, FormGroup, TextField } from "@mui/material";
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

export const Show = () => {
    const connection = useConnection();
    const wallet = useWallet();

    const [mintA, setMintA] = React.useState(localStorage.getItem("mintA") || "");
    const [mintB, setMintB] = React.useState(localStorage.getItem("mintB") || "");
    const [entangledPair, setEntangledPair] = React.useState(localStorage.getItem("entangledPair") || "");
    const [entangledPairInfo, setEntangledPairInfo] = React.useState(localStorage.getItem("entangledPairInfo") || "");

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

        })()
    }, [
        anchorWallet,
    ]);

    const handleSubmit = async (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!anchorWallet) {
            return;
        }
        try {
            const epObj = await showEntanglement(anchorWallet, connection, entangledPair, mintA, mintB);
            let info = "";
            info += ('-----\n');
            //@ts-ignore
            info += 'Treasury Mint: ' + `${epObj.treasuryMint.toBase58()}\n`;
            //@ts-ignore
            info += 'Authority: ' + `${epObj.authority.toBase58()}\n`;
            //@ts-ignore
            info += 'Mint A: ' + `${epObj.mintA.toBase58()}\n`;
            //@ts-ignore
            info += 'Mint B: ' + `${epObj.mintB.toBase58()}\n`;
            //@ts-ignore
            info += 'Token A Escrow: ' + `${epObj.tokenAEscrow.toBase58()}\n`;
            //@ts-ignore
            info += 'Token B Escrow: ' + `${epObj.tokenBEscrow.toBase58()}\n`;
            //@ts-ignore
            info += 'Price: ' + `${epObj.price.toNumber()}\n`;
            //@ts-ignore
            info += 'Paid At Least Once: ' + `${epObj.paid}\n`;
            //@ts-ignore
            info += 'Pays Every Time: ' + `${epObj.paysEveryTime}\n`;
            //@ts-ignore
            info += 'Bump: ' + `${epObj.bump}\n`;
            setEntangledPairInfo(info);
        } catch (e) {
            // TODO Show Error  
            setEntangledPairInfo(e.message);
        }
    };

    const isEnable = (mintA: string, mintB: string, entangledPair: string): boolean => {
        return (
            // eslint-disable-next-line no-extra-boolean-cast
            (!!mintA && !!mintB && !(!!entangledPair)) ||
            (!(!!mintA || !!mintB) && !!entangledPair)
        )
    }

    return (
        <React.Fragment>
            <Typography variant="h4" color="text.primary" gutterBottom>Show Entanglement</Typography>
            <p>
                Enter MintA and MintB or Entangled Pair.
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
                    <Button
                        variant="contained"
                        onClick={async (e) => await handleSubmit(e)}
                        endIcon={<SendIcon />}
                        disabled={!isEnable(mintA, mintB, entangledPair)}
                    >
                        Show Entanglement
                    </Button>
                </FormGroup>
                { !isEnable(mintA, mintB, entangledPair) && 
                    <Alert severity="warning" style={{ marginTop: "1rem" }}>
                        <AlertTitle>Warning</AlertTitle>
                        The three inpust are filled. You should enter MintA and MintB or Entangled Pair.
                    </Alert>
                }
            </Box>
            <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
                <TextField
                    multiline
                    fullWidth
                    rows={20}
                    id="price-text-field"
                    label="Entanglement Info"
                    value={entangledPairInfo}
                    InputProps={{
                        readOnly: true,
                    }}

                />
            </Box>


        </React.Fragment>
    );
}

