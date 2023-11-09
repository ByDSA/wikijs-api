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

echo "NODE VERSION: $(sudo node -v)"

PACKAGE="wikijs-api"
echo "PACKAGE: $PACKAGE"

echo "Cloning $PACKAGE ..."
TMP_DIR=".tmp-$PACKAGE"
sudo rm -rf "$TMP_DIR"

sudo git clone "https://github.com/ByDSA/wikijs-api" "$TMP_DIR"

if [ -L "$TMP_DIR" ]; then
  ROOT_PACKAGE=$(readlink "$TMP_DIR")
  echo "ROOT_PACKAGE: $TMP_DIR"
  sudo rm -rf "$TMP_DIR"
  echo "Moving $ROOT_PACKAGE to $TMP_DIR"
  sudo mv "$ROOT_PACKAGE" "$TMP_DIR"
  echo "Changing permissions of $TMP_DIR"
  sudo chmod -R 755 "$TMP_DIR"
fi
echo "Installing dependencies ..."
cd "$TMP_DIR"
sudo npm i
echo "Building ..."
sudo npm run build
cd ..

FINAL_DIR="$NODE_PATH/$PACKAGE"
sudo rm -rf "$FINAL_DIR"
sudo mv "$TMP_DIR" "$FINAL_DIR"

BIN_OUT=/usr/local/bin/wikijs
echo "Creating symlink for $BIN_OUT ..."
sudo rm -rf "$BIN_OUT"
sudo ln -s "$FINAL_DIR/dist/cli/bin.js" "$BIN_OUT"
echo "Changing permissions of $BIN_OUT ..."
sudo chmod +x "$BIN_OUT"

wikijs -v >/dev/null 2>&1

echo "Done!"
