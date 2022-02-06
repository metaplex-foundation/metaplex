# CANDY MACHINE

https://user-images.githubusercontent.com/81876372/133098938-dc2c91a6-1280-4ee1-bf0e-db0ccc972ff7.mp4

## Documentation

Gettting started and usage instructions can be found at https://docs.metaplex.com/candy-machine-v2/introduction

## Settings examples

```json
{
  "price": 0.01,
  "number": 10000,
  "gatekeeper": {
    "gatekeeperNetwork": "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6",
    "expireOnUse": true
  },
  "solTreasuryAccount": null,
  "splTokenAccount": null,
  "splToken": null,
  "goLiveDate": "11 Dec 2021 13:00:00 CST",
  "endSettings": null,
  "whitelistMintSettings": null,
  "hiddenSettings": null,
  "storage": "arweave",
  "ipfsInfuraProjectId": null,
  "ipfsInfuraSecret": null,
  "awsS3Bucket": null,
  "noRetainAuthority": false,
  "noMutable": false
}
```

See example-candy-machine-upload-config.json

### Captcha Settings (Gateway)

Want captcha? Add this for gatekeeper value and you are done:

```
{
    "gatekeeperNetwork": "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6",
    "expireOnUse": true
  }
```

### Hidden Settings

If you plan to do a mint larger than 20k, consider this option. With this, none of the arweave URIs actually go on Solana. You just provide the following in the config for hiddenSettings:

```
{
"name": "Billy Bob ",
"uri": "https://arweave.net/w_yuIHAmS10B4VFGVGqdSig3fYqZ5_SwR_DUCll1o3c",
"hash": "44kiGWWsSgdqPMvmqYgTS78Mx2BKCWzd"
}

```

And it will mint the same URI and name (plus #45 or whatever, notice the space I left in there)
each time someone mints. You will need to use a script to make a post-mint update. One
will be inside the candy machine CLI soon.

The hash can be any 32 character string you want but would preferably be a hash of the cache
file itself so that the order can be verified by others after the mint is complete.

### End Settings

Stop a mint at a date

```
{
"endSettingType": { "date": true },
"value": "11 Dec 2021 13:30:00 CST"
}
```

Stop a mint after a certain amount have sold

```
{
"endSettingType": { "amount": true },
"value": 10
}

```
### Whitelist Mint Settings

Here are some examples to help you construct your settings file.

I want to burn the token each time. This whitelist is ONLY used for presale,
and once the sale begins, the whitelist gets you nothing.

```

"whitelistMintSettings": {
"mode": { "burnEveryTime": true },
"mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf",
"presale": true,
"discountPrice": null
},

```

I want to burn the token each time. This whitelist is ONLY used for presale, and gives users
a 0.5 SOL price tag instead. Once the sale begins, the whitelist gets you only a discount.

```

"whitelistMintSettings": {
"mode": { "burnEveryTime": true },
"mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf",
"presale": true,
"discountPrice": 0.5
},

```

I do not want to burn the whitelist token - it can be reused. This whitelist is ONLY used for presale, and gives users
a 0.5 SOL price tag instead. Once the sale begins, the whitelist gets you only a discount.

```

"whitelistMintSettings": {
"mode": { "neverBurn": true },
"mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf",
"presale": true,
"discountPrice": 0.5
},

```

I do not want to burn the whitelist token - it can be reused. This whitelist is ONLY used to grant users discounts - a 0.5 SOL price tag.

```

"whitelistMintSettings": {
"mode": { "neverBurn": true },
"mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf",
"presale": false,
"discountPrice": 0.5
},

```

I want the whitelist token to be burned every mint. This whitelist runs during the sale(not presale) and will restrict any user without such a token from purchasing at all. This
is because why would you have this setting with no discount price unless you wanted it
applied to all.

```

"whitelistMintSettings": {
"mode": { "burnEveryTime": true },
"mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf",
"presale": false,
"discountPrice": null
},

```

## Creating generative art

There are many excellent tools you can use to create generative art. One such open source tool is [HashLips](https://github.com/HashLips/hashlips_art_engine). 

## Development

### Build

```
yarn install
yarn build
```

### Lint and test

```
yarn test
yarn test
```
