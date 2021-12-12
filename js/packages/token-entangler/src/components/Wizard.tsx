import { Box, Button, FormGroup, LinearProgress } from "@mui/material";
import React, { useState, useMemo } from "react";
import SearchIcon from '@mui/icons-material/Search';
import {
    useConnection,
} from "../contexts";

import {
    useWallet,
} from "@solana/wallet-adapter-react";

import * as anchor from '@project-serum/anchor';
import { getOwnedNFTMints, searchEntanglements } from "../utils/entangler";
import { useHistory } from "react-router-dom";
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export const Wizard = () => {
    const connection = useConnection();
    const wallet = useWallet();
    const history = useHistory();

    const [entanglements, setEntanglements] = React.useState<Array<object>>([]);
    const [loading, setLoading] = useState(false);


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
        console.log(process.env)
        const authority = process.env.REACT_APP_WHITELISTED_AUTHORITY!;
        if (!anchorWallet) {
            return;
        }
        setLoading(true);
        setEntanglements([])
        const res = await getOwnedNFTMints(anchorWallet, connection);
        const walletNFTMints = res.map((token) => (token.info.mint));
        const allEntanglementsMap = Promise.all(walletNFTMints.map(async (mint) => {
            return { mint: mint, entanglements: await searchEntanglements(anchorWallet, connection, mint, authority) };
        }));
        setEntanglements([... await allEntanglementsMap]);
        setLoading(false);
    };

    const handleEntanglementClick = async (event: React.MouseEvent<HTMLElement>, entanglement: any) => {
        event.preventDefault();

        localStorage.setItem('mintA', entanglement.mintA.toString());
        localStorage.setItem('mintB', entanglement.mintB.toString());
        localStorage.setItem('entanglement', "");
        history.push(`swap/`);
    };

    return (
        <React.Fragment>
            <h1>Search NFT Entanglements</h1>
            <p>Searches entanglements of your NFTs</p>

            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                <FormGroup>
                    <Button disabled={!anchorWallet || loading} variant="contained" onClick={async (e) => await handleSubmit(e)} endIcon={<SearchIcon />}>
                        Search Entanglements
                    </Button>
                </FormGroup>

            </Box>
            <Box sx={{ maxWidth: 'md', display: 'block', marginTop: '2rem' }}>
                <h2>My NFT mints:</h2>
                {loading && <LinearProgress />}
                {//@ts-ignore
                    entanglements.map((e) => (<li key={e.mint}>{e.mint}{e.entanglements.length > 0 &&
                        <p>
                            <ul>
                                {//@ts-ignore 
                                    e.entanglements.map((e) => (<li key={e.mintA.toString()}> <Button onClick={(event) => handleEntanglementClick(event, e)} variant="contained" startIcon={<SwapHorizIcon />}>
                                        SWAP
                                    </Button> {`Mints: ${e.mintA.toString()} - ${e.mintB.toString()} \n -- Price: ${e.price.toString()} -- Pays Every Time: ${e.paysEveryTime}`} </li>))}.
                            </ul>
                        </p>

                    } </li>))}
            </Box>
        </React.Fragment>
    );

}