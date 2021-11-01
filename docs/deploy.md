# Deploy

## GitHub Pages

Primarily you need to specify your repo in `js/packages/web/package.json` file

Pay attention to these two lines:

```json
"deploy:gh": "yarn export && gh-pages -d ../../build/web --repo https://github.com/metaplex-foundation/metaplex -t true",
"deploy": "cross-env ASSET_PREFIX=/metaplex/ yarn build && yarn deploy:gh",
```

There are 2 things to change:

- specify your repo URL instead of `https://github.com/metaplex-foundation/metaplex` (for example, `https://github.com/my-name/my-metaplex`)
- set `ASSET_PREFIX` to repo name (for example, `ASSET_PREFIX=/my-metaplex/`)

After that, the lines will look like this:

```json
"deploy:gh": "yarn export && gh-pages -d ../../build/web --repo https://github.com/my-name/my-metaplex -t true",
"deploy": "cross-env ASSET_PREFIX=/my-metaplex/ yarn build && yarn deploy:gh",
```

And after that, you can publish the Metaplex app to GitHub Pages by the following commands:

```bash
cd js/packages/web
yarn deploy
```

Note that if you have 2fa enabled, you'll need to use a personal access token as your password:

https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token

### GitHub Pages with a custom domain

If you have a custom domain linked to the GitHub Pages in your repo, then the instructions are the same as above, but your need to remove  `ASSET_PREFIX` from the deploy script:

```json
"deploy:gh": "yarn export && gh-pages -d ../../build/web --repo https://github.com/my-name/my-metaplex -t true"
"deploy": "yarn build && yarn deploy:gh",
```

The publishing commands are the same:

```bash
cd js/packages/web
yarn deploy
```

## Vercel

To publish the Metaplex app to Vercel, you first need to visit [https://vercel.com/](https://vercel.com/) and create a new project linked to your github repo. Then, create a `pages/` directory under `js`.

After that, configure this project with the following settings:

- Framework: `Next.js`
- Root directory: `js`
- Output directory: `packages/web/.next`

One last thing: specify `REACT_APP_STORE_OWNER_ADDRESS_ADDRESS` in the Environment Variables section

## Google Cloud Run

We can deploy deploy through docker and cloud run.
Let's visit [Cloud Run](https://console.cloud.google.com/run)

### Prepare your docker container

1. change `Dockerfile` `ENV REACT_APP_STORE_OWNER_ADDRESS_ADDRESS=""` to your address.
2. change `REACT_APP_STORE_OWNER_ADDRESS_ADDRESS` to your address. on `js/packages/web/.env.production`
3. use `docker build . -t` build your image.
4. use `gcloud cli` upload your image` [read](https://cloud.google.com/container-registry/docs/pushing-and-pulling)

### Create Clound Run Services

visit [Cloud Run](https://console.cloud.google.com/run)

1. click create service
2. setup your service name, like `my nft store`
3. choose your uploaded image
4. open adcanced setings
    1. switch to Variables and keys
    2. add Environment Variables
        1. name: `NODE_ENV`, value: `production`
5. set up & finish your create.

### setup your domain

visit [Cloud Run](https://console.cloud.google.com/run)

1. switch to manage custom domain
2. setup your domain and bind service.
