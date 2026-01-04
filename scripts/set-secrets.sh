#!/bin/bash
# Set Amplify sandbox secrets from .env.local file
# Reads key=value pairs and sets them as sandbox secrets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env.local file found at $ENV_FILE"
  echo "Copy .env.local.example to .env.local and fill in your values"
  exit 0
fi

echo "Setting sandbox secrets from .env.local..."

while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

  # Trim whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Skip placeholder values
  if [[ "$value" == *"your-"*"-here"* ]]; then
    echo "  Skipping $key (placeholder value)"
    continue
  fi

  # Skip empty values
  if [ -z "$value" ]; then
    echo "  Skipping $key (empty value)"
    continue
  fi

  echo "  Setting $key..."
  echo "$value" | npx ampx sandbox secret set "$key" 2>/dev/null
done < "$ENV_FILE"

echo "Done setting secrets"
