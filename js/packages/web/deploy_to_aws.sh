echo "Removing old build files ...."
rm -rf out
rm -rf build

cd ../..

echo "Build common package ...."
yarn build

cd packages/web

echo "Build web package ...."
npx env-cmd -f .env.production next build && npx next export

echo "deploying to AWS S3 bucket ...."
aws s3 sync out/ s3://karmaplex-web/ --recursive
