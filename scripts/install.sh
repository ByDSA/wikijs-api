#!/bin/bash
set -e

# Install npm if not installed
if ! [ -x "$(command -v npm)" ]; then
  sudo apt-get install npm
fi

if [ -z "$NODE_PATH" ]; then
  NODE_PATH=$(npm root -g)
fi
echo "NODE_PATH: $NODE_PATH"

PACKAGE="wikijs-api"
echo "PACKAGE: $PACKAGE"

echo "Cloning $PACKAGE ..."
sudo rm -rf "$NODE_PATH/$PACKAGE"
sudo git clone "https://github.com/ByDSA/wikijs-api" "$NODE_PATH/$PACKAGE"

if [ -L "$NODE_PATH/$PACKAGE" ]; then
  ROOT_PACKAGE=$(readlink "$NODE_PATH/$PACKAGE")
  echo "ROOT_PACKAGE: $ROOT_PACKAGE"
  sudo rm -rf "$NODE_PATH/$PACKAGE"
  echo "Moving $ROOT_PACKAGE to $NODE_PATH/$PACKAGE"
  sudo mv "$ROOT_PACKAGE" "$NODE_PATH/$PACKAGE"
  echo "Changing permissions of $NODE_PATH/$PACKAGE"
  sudo chmod -R 755 "$NODE_PATH/$PACKAGE"
fi
echo "Installing dependencies ..."
cd "$NODE_PATH/$PACKAGE"
sudo npm i
echo "Building ..."
sudo npm run build

BIN_OUT=/usr/local/bin/wikijs
echo "Creating symlink for $BIN_OUT ..."
sudo rm -rf "$BIN_OUT"
sudo ln -s "$NODE_PATH/$PACKAGE/dist/cli/bin.js" "$BIN_OUT"
echo "Changing permissions of $BIN_OUT ..."
sudo chmod +x "$BIN_OUT"

wikijs -v >/dev/null 2>&1

echo "Done!"
