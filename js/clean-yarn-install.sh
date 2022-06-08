echo "Starting to clean install ....."
echo "Removing js node modules ...."
rm -rf ./node_modules
echo "Removing web node modules ...."
rm -rf ./web/node_modules
echo "Removing js yarn lock file ...."
rm ./yarn.lock
echo "Clearning npm cache ...."
yarn cache clean

echo "yarn install"
yarn install 
echo "Successfully cleaned and installed packages"

