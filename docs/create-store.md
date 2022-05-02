# Create Store

To create a storefront powered by Metaplex, you need to create a store on the Metaplex platform. This guide will outline
steps you need to take to create your store. After creating your store, this guide will show you how to manage your
store information, such as who to whitelist as creators.

## Prerequisites
* You should have an understanding of `React` concepts such as hooks. Please refer to the React documentation
  [here](https://reactjs.org/docs/getting-started.html).
* To create your store, you will need to have a wallet that contains token to perform your transactions.
* Knowing what the different `packages` are and what are their purposes would help but isn't required

## Getting Started

### Setting Up the Store ID

To create a store, you must first derive the store ID given your public address. The Metaplex devs have already created
an environment variable for you to utilize - `REACT_APP_STORE_OWNER_ADDRESS_ADDRESS` - which you should set to be your
wallet public address. To do this, you can create a `.env` file in `packages/web`, and set
`REACT_APP_STORE_OWNER_ADDRESS_ADDRESS` to be your wallet public address in there.

```
REACT_APP_STORE_OWNER_ADDRESS_ADDRESS=YOUR_PUBLIC_WALLET_ADDRESS
```

### Create Your Store

After creating your store ID, you may now create your store. The Metaplex platform has many helper methods to help you
to create your store. To create your store, you can use the `saveAdmin` method (`packages/web/src/actions/saveAdmin`)
The easiest way to do this would be to either create a script or render a button locally to click to call this method.
Please look at the function parameters of `saveAdmin` to see what parameters you would like to pass in:

```js
saveAdmin(connection, wallet, false, [])
```

If you opted to create a button or something to click to call this method, here are some small snippets:

```js
// These are hooks you should insert at the top of the component your rendering your button in
const { wallet } = useWallet();
const connection = useConnection();
```

```js
// The button to render somewhere for you to click
<Button onClick={async () => {
        try {
          await saveAdmin(connection, wallet, false, [])
        } catch (e) {
          console.error(e);
        }
}}>CREATE STORE</Button>
```

You will be required to confirm your transactions if you decided to put a button or something to click. After clicking
the button, make sure you don't browse anywhere else or close the website.

### Adding Your Information

After creating your store, you must also insert your wallet public key and information in `userNames.json` at
`packages/web/src/config/userNames.json`. Make sure you follow the same format as the other objects in this file.

### Accessing the Admin Panel

After creating your store, you can now access `YOUR_URL/#/admin`. This is where you can edit your store and add
whitelisted creators. Add yourself if you need to or make it a public store, so anyone can create NFTs in your store.
Remember to click save after making your changes.
