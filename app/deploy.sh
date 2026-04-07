#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
INSTANCE_NAME="finance-agent"
MACHINE_TYPE="e2-standard-2"
IMAGE_NAME="finance-agent"

echo "==> Step 1: Copy .claude plugins into Docker context"
bash setup-project.sh

echo ""
echo "==> Step 2: Build Docker image"
docker build -t "gcr.io/${PROJECT_ID}/${IMAGE_NAME}" .

echo ""
echo "==> Step 3: Push to GCR"
gcloud auth configure-docker --quiet
docker push "gcr.io/${PROJECT_ID}/${IMAGE_NAME}"

echo ""
echo "==> Step 4: Deploy to Compute Engine"

if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --project="$PROJECT_ID" &>/dev/null; then
  echo "Instance exists, updating container..."
  gcloud compute instances update-container "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --container-image="gcr.io/${PROJECT_ID}/${IMAGE_NAME}"
else
  echo "Creating new VM..."
  gcloud compute instances create-with-container "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --machine-type="$MACHINE_TYPE" \
    --container-image="gcr.io/${PROJECT_ID}/${IMAGE_NAME}" \
    --container-mount-host-path=mount-path=/root/.claude,host-path=/home/claude-auth,mode=rw \
    --tags=http-server \
    --scopes=default

  gcloud compute firewall-rules create allow-http-finance-agent \
    --project="$PROJECT_ID" \
    --allow=tcp:8080 \
    --target-tags=http-server \
    --description="Allow HTTP traffic to finance-agent" \
    2>/dev/null || true
fi

IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "============================================"
echo "  Deployed to: http://${IP}:8080"
echo "============================================"
echo ""
echo "NEXT: Authenticate Claude Code on the VM:"
echo ""
echo "  1. SSH into the VM:"
echo "     gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}"
echo ""
echo "  2. Enter the container:"
echo "     docker exec -it \$(docker ps -q) bash"
echo ""
echo "  3. Login with your Claude account:"
echo "     claude auth login"
echo ""
echo "  This uses your Claude Pro/Max subscription."
echo "  No API key needed."
