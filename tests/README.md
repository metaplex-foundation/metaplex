# Integration Tests

Consider this a demonstration of how to setup integration tests for a Metaplex application
using [cypress.io](https://cypress.io) as the test runner.

Tests run interface with a locally running test validator which allows you to trace processes
transactions via `solana logs`.

## Getting Started

- install [solana-test-validator](https://docs.solana.com/developing/test-validator)
- Clone this repo and `cd tests`

### Setting up the Validator and Starting the App

```sh
# Build Metaplex programs
yarn setup:programs

# Prepare and start Validator
yarn setup:validator

# Start the App we are testing
yarn app:start 
```

### Running the Tests

There are several ways to run the tests:

- `yarn cypress` runs them headless in Chrome which is suitable for CI as well
- `yarn cypress:headed` runs them in Chrome
- `yarn cypress:open` opens the Cypress app which allows running tests and reruns them when
  they change which is suited for ongoing development
- `yarn cypress:open-dev` same as `yarn cypress:open` except that devtools opens automatically
  when tests start running which allows you to see logs and network requests

## How Things work

### Setup

Setup scripts are authored in TypeScript and run directly via `esr` the
[esbuild-runner](https://github.com/folke/esbuild-runner).

The main setup is performed by `./setup/src/init-test-validator.ts`. This script starts the
test validator with the metaplex programs pre-deployed under the same program id that is used
in main-net and dev-net.
Prior to starting up it writes a custom config to be used by the validator which facilitates
testing. The config is written to `./setup/config/solana-validator.yml`.

Inside `./setup/keypairs/` some keypairs are exposed that are included in the validator and
funded via airdrop. They are exposed to the tests via `./common/public-keys.ts`.

### Tests

The tests and related config are found inside the `./cypress/` folder.

- `./cypress/fixtues/` contain _canned_ responses for API requests in order to speed up tests
  and support running them offline
- `./cypress/support/index.ts` injects the fake
  [phan-wallet-mock](https://github.com/thlorenz/phan-wallet-mock) in order to facilitate
  signing transaction without needing the user to confirm via a wallet UI.
  - it also intercepts calls to some APIs and stubs them with _canned_ responses
- `./cypress/utils.ts` contain functions to help setup tests
- `./cypress/integration/` contains all tests grouped by topic, only success cases have been
  implemented giving room for devs to experiment to implement some failure cases

## Issues

Tests run very stable except for very few instances when a button to click is not found in the
DOM which happens very rarely.

However the main caveat is that tests requiring the store to be initialized are fairly slow as
_init store_ takes about 15secs to be confirmed and render the `/admin` page fully. This can be
a problem when working on tests for features that require an initialized store.

An improvement would be to initialize a number of stores at validator setup for different store
owners and use those pre-initialized stores in the tests.
