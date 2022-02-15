import React from 'react';
import { Link } from 'react-router-dom';

import { Stack } from '@mui/material';

import { useWindowDimensions } from '../components/AppBar';

const WHITESPACE = '\u00A0';

export const About = () => {
  const summary = (
    <Stack spacing={1}>
      <div>
        The Gumdrop program leverages the Solana blockchain and merkle trees to
        facilitate airdrops to a large number of whitelisted users at a low cost
        to creators.
      </div>

      <div>
        Various ecosystem projects want to ensure early followers and supporters
        gain access to project assets whether they be tokens, NFTs, or others.
        Simultaneously, capitalization of these assets should not incur undue
        costs or operational overhead to the creators. There are several ways to
        achieve such a setup and Gumdrop offers one that integrates with
        existing Solana and Metaplex ecosystem programs.
      </div>

      <div>
        Gumdrop solves this efficient-airdrop issue by utilizing a
        space-efficient hash structure (the merkle tree) such that an on-chain
        program can validate whether the user is part of a whitelist. This uses
        a pull-based paradigm to shift the burden from creators, sending
        airdrops or pre-minting NFTs, to recipients, that can choose to claim
        their portion or leave it for general adoption.
      </div>

      <div>
        The approach, originally pioneered for token airdrops by{' '}
        <a
          href="https://github.com/Uniswap/merkle-distributor"
          target="_blank"
          rel="noreferrer"
        >
          Uniswap
        </a>{' '}
        and ported to Solana by{WHITESPACE}
        <a
          href="https://github.com/saber-hq/merkle-distributor"
          target="_blank"
          rel="noreferrer"
        >
          Saber
        </a>
        , is extended to allow pre-minting a Candy Machine or printing editions
        of a master copy. Moreover, Gumdrop allows creators to directly send
        whitelisted users a drop reclamation link by building the tree with
        off-chain handles (e.g email, discord, etc) and allowing the user to
        redeem into any wallet.
      </div>
    </Stack>
  );

  const create = (
    <Stack spacing={1}>
      <a>CREATION</a>

      <div>
        Creation builds a whitelist of users that can claim either existing
        fungible tokens or directly mint from a pre-sale Candy Machine. See a
        full explanation on the{' '}
        <a
          href="https://docs.metaplex.com/airdrops/create-gumdrop"
          target="_blank"
          rel="noreferrer"
        >
          Metaplex Docs
        </a>
      </div>

      <div>
        Click{' '}
        <a
          href={`data:text/plain;charset=utf-8,${JSON.stringify(
            require('./example.json'),
          )}`}
          download="example.json"
        >
          here
        </a>{' '}
        for an example distribution list with emails.
      </div>
    </Stack>
  );

  const claim = (
    <Stack spacing={1}>
      <Link to={`/claim`}>CLAIMS</Link>

      <div>
        Claims are redeemed through a URL with query parameters holding
        claim-specific keys. Claimants will need to verify ownership of the
        specified handle by answering a OTP challenge and pay the rent and
        minting fees if applicable.
      </div>
    </Stack>
  );

  const close = (
    <Stack spacing={1}>
      <a>CLOSING</a>

      <div>
        Closing the Gumdrop cleans up the on-chain state and allows creators to
        recycle any lamports held for rent-exemption after the airdrop is
        complete.
      </div>

      <div>
        When closing a Candy Machine-integrated distributor, update authority
        will be transferred back to the wallet owner.
      </div>
    </Stack>
  );

  const steps = [
    { name: 'summary', inner: summary },
    { name: 'create', inner: create },
    { name: 'claim', inner: claim },
    { name: 'close', inner: close },
  ];

  const maxWidth = 960;
  const { width } = useWindowDimensions();

  return (
    <Stack
      alignContent="left"
      textAlign="left"
      spacing={2}
      style={{
        margin: 'auto',
        maxWidth: Math.min(width, maxWidth),
      }}
    >
      {steps.map((s, idx) => (
        <div key={idx}>{s.inner}</div>
      ))}
    </Stack>
  );
};
