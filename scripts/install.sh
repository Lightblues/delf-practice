#!/bin/bash
# DELF Practice App Installer
# This script installs the unsigned app by removing quarantine attributes.
# Double-click to run, or execute: bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="DELF Practice"
SOURCE_APP="${SCRIPT_DIR}/${APP_NAME}.app"
INSTALL_PATH="/Applications/${APP_NAME}.app"

echo "================================"
echo "  DELF Practice App Installer"
echo "================================"
echo ""

# Check if source app exists
if [ ! -d "$SOURCE_APP" ]; then
  echo "Error: ${APP_NAME}.app not found in ${SCRIPT_DIR}"
  echo "Please make sure this script is in the same folder as the app."
  exit 1
fi

# Kill running app if exists
if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
  echo "Stopping running ${APP_NAME}..."
  pkill -x "$APP_NAME" || true
  sleep 1
fi

# Remove old version if exists
if [ -d "$INSTALL_PATH" ]; then
  echo "Removing old version..."
  rm -rf "$INSTALL_PATH"
fi

# Copy to Applications
echo "Installing to ${INSTALL_PATH}..."
cp -R "$SOURCE_APP" /Applications/

# Clear quarantine attribute (required for unsigned apps)
echo "Clearing quarantine attribute..."
xattr -cr "$INSTALL_PATH"

echo ""
echo "✅ ${APP_NAME} installed successfully!"
echo ""
echo "You can now open it from Applications or run:"
echo "  open '/Applications/${APP_NAME}.app'"
echo ""

# Ask to open the app
read -p "Open ${APP_NAME} now? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  open "$INSTALL_PATH"
fi
