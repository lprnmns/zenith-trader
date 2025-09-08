#!/bin/bash

# Azure VM Deployment Script for Zenith Trader
# This script sets up the production environment on Azure Ubuntu VM

set -e

echo "🚀 Starting Zenith Trader Deployment to Azure VM"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="zenith-trader-vm"
RESOURCE_GROUP="zenith-trader-rg"
LOCATION="westeurope"
VM_SIZE="Standard_B2s"  # 2 vCPUs, 4 GB RAM
ADMIN_USER="zenithAdmin"
APP_DIR="/home/${ADMIN_USER}/zenith-trader"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Login to Azure
print_status "Logging into Azure..."
az login

# Create resource group
print_status "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create VM
print_status "Creating Ubuntu VM..."
az vm create \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --image "Canonical:0001-com-ubuntu-server-focal:20_04-lts-gen2:latest" \
    --size $VM_SIZE \
    --admin-username $ADMIN_USER \
    --generate-ssh-keys \
    --public-ip-sku Standard \
    --nsg-rule SSH

# Open ports for the application
print_status "Opening required ports..."
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 80 --priority 900
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 443 --priority 901
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 3001 --priority 902

# Get VM IP address
VM_IP=$(az vm show -d -g $RESOURCE_GROUP -n $VM_NAME --query publicIps -o tsv)
print_status "VM created with IP: $VM_IP"

# Create setup script to run on VM
cat > setup-vm.sh << 'EOF'
#!/bin/bash

set -e

echo "📦 Setting up Zenith Trader on VM..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install Git
echo "📚 Installing Git..."
sudo apt-get install -y git

# Install Node.js (for any scripts we might need)
echo "📗 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw --force enable

# Create app directory
mkdir -p ~/zenith-trader
cd ~/zenith-trader

echo "✅ VM setup complete!"
EOF

# Copy setup script to VM and execute
print_status "Copying setup script to VM..."
scp setup-vm.sh ${ADMIN_USER}@${VM_IP}:~/setup-vm.sh

print_status "Executing setup script on VM..."
ssh ${ADMIN_USER}@${VM_IP} "chmod +x ~/setup-vm.sh && ~/setup-vm.sh"

# Clean up local setup script
rm setup-vm.sh

print_status "VM setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. SSH into VM: ssh ${ADMIN_USER}@${VM_IP}"
echo "2. Clone your repository"
echo "3. Create .env.production file with your secrets"
echo "4. Run: docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "🌐 Your VM IP: ${VM_IP}"
