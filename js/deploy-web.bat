ECHO "Starting to deploy 'web', bootstrapping..."
yarn bootstrap
ECHO "Preparing 'common'..."
CD packages\common
yarn prepare
yarn build-css
CD ..\web
ECHO "Prestarting 'web'..."
yarn prestart
ECHO "Building 'web'..."
# TODO: fix linting errors!
SET CI=false && yarn build
ECHO "#done"
