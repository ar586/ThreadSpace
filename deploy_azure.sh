#!/bin/bash
set -e

# Setup parameters
RESOURCE_GROUP="rg-threadspace"
LOCATION="eastus"
STORAGE_ACCOUNT_NAME="threadstor$(date +%s%N | cut -b1-6)" # Unique name
CONTAINER_NAME="threads-audio"
APP_ENV_NAME="threadspace-env"
APP_NAME="threadspace-backend"

echo "=== 1. Authenticating to Azure ==="
az login

echo "=== 2. Creating Resource Group ==="
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "=== 3. Provisioning Storage Account ($STORAGE_ACCOUNT_NAME) ==="
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access true

echo "=== 4. Getting Storage Connection String ==="
CONN_STRING=$(az storage account show-connection-string -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT_NAME -o tsv)

echo "=== 5. Creating Blob Container ($CONTAINER_NAME) with Public Read Access ==="
az storage container create \
  --name $CONTAINER_NAME \
  --connection-string "$CONN_STRING" \
  --public-access blob

echo "=== 6. Creating Container Apps Environment ==="
# Ensure the Container Apps extension is installed
az extension add --name containerapp --upgrade || true

az containerapp env create \
  --name $APP_ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

echo "=== 7. Deploying FastAPI Backend to Azure Container Apps ==="
# Note: You must ensure DATABASE_URL is set in your environment before running this,
# or manually replace the placeholder below.
DATABASE_URL=${DATABASE_URL:-"your-neon-or-supabase-db-url"}

az containerapp up \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $APP_ENV_NAME \
  --source ./backend \
  --ingress external \
  --target-port 8000 \
  --env-vars "DATABASE_URL=$DATABASE_URL" "AZURE_STORAGE_CONNECTION_STRING=$CONN_STRING"

echo "=== Deployment Complete! ==="
echo "Azure Storage Connection String (save this securely):"
echo "$CONN_STRING"
echo ""
echo "Please find the API FQDN URL in the Azure portal for your container app,"
echo "and use it to update the NEXT_PUBLIC_API_URL in your Vercel frontend."
