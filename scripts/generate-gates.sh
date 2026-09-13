#!/bin/bash
# Generate secret gate paths for Admin and Super Admin
# Usage: ./scripts/generate-gates.sh

set -e

ADMIN_PATH="/gate-$(head -c 12 /dev/urandom | base32 | tr '[:upper:]' '[:lower:]' | cut -c1-6)"
SUPER_PATH="/root-$(head -c 12 /dev/urandom | base32 | tr '[:upper:]' '[:lower:]' | cut -c1-6)"

echo "Generating secret gate paths..."
echo "ADMIN_GATE_PATH=$ADMIN_PATH"
echo "SUPER_GATE_PATH=$SUPER_PATH"

# Update .env file
if [ -f .env ]; then
  # Remove existing gate paths
  grep -v "ADMIN_GATE_PATH\|SUPER_GATE_PATH" .env > .env.tmp || true
  mv .env.tmp .env
  echo "ADMIN_GATE_PATH=\"$ADMIN_PATH\"" >> .env
  echo "SUPER_GATE_PATH=\"$SUPER_PATH\"" >> .env
  echo "Updated .env with new gate paths"
else
  echo "DATABASE_URL=\"file:./dev.db\"" > .env
  echo "ADMIN_GATE_PATH=\"$ADMIN_PATH\"" >> .env
  echo "SUPER_GATE_PATH=\"$SUPER_PATH\"" >> .env
  echo "Created .env with gate paths"
fi

echo ""
echo "Gates generated:"
echo "  Admin gate: $ADMIN_PATH"
echo "  Super gate: $SUPER_PATH"
echo ""
echo "Store these securely. They are not in client code."
