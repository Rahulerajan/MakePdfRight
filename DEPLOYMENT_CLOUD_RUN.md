# Google Cloud Run Deployment & Secret Manager Guide

This guide provides the exact commands and architecture for deploying **MakePDFRight** as a unified full-stack application on **Google Cloud Run** with **Google Cloud Secret Manager** and **Firestore**.

---

## 1. Prerequisites & Environment Configuration

Ensure Google Cloud SDK (`gcloud`) is installed and configured:

```bash
# Set your target Google Cloud Project ID and Region
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="makepdfright"
export SERVICE_ACCOUNT_NAME="makepdfright-runner"

gcloud config set project "$PROJECT_ID"

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Service Account & Least-Privilege IAM Roles

Create a dedicated least-privilege service account for Cloud Run execution:

```bash
# 1. Create the runtime service account
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --display-name="MakePDFRight Cloud Run Runtime Account"

export SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 2. Grant Firestore user access (data access only, no admin privilege)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

# 3. Grant Secret Manager secret accessor (read secrets at runtime)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Secret Manager Provisioning

Provision production secrets in Google Cloud Secret Manager.

```bash
# 1. GEMINI_API_KEY (Required for Gemini 2.5/2.0 AI models)
gcloud secrets create GEMINI_API_KEY \
  --replication-policy="automatic"

echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. COOKIE_SECRET (Cryptographic signing key for session cookies)
gcloud secrets create COOKIE_SECRET \
  --replication-policy="automatic"

openssl rand -hex 32 | gcloud secrets versions add COOKIE_SECRET --data-file=-

# 3. FIREBASE_ADMIN_CREDENTIALS (Optional if running on GCP with Default Application Credentials;
# required if using an external Firebase service account key JSON)
gcloud secrets create FIREBASE_ADMIN_CREDENTIALS \
  --replication-policy="automatic"

cat path/to/service-account.json | gcloud secrets versions add FIREBASE_ADMIN_CREDENTIALS --data-file=-
```

---

## 4. Container Build via Cloud Build / Artifact Registry

Build and push the multi-stage Docker image:

```bash
# 1. Create Artifact Registry Docker repository (if not already existing)
gcloud artifacts repositories create makepdfright-repo \
  --repository-format=docker \
  --location="$REGION" \
  --description="MakePDFRight container images"

export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/makepdfright-repo/${SERVICE_NAME}:v56"

# 2. Submit container build using the multi-stage Dockerfile
gcloud builds submit --tag "$IMAGE_URI" .
```

---

## 5. Google Cloud Run Deployment Command

Deploy the unified Express and Vite application to Google Cloud Run:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --platform="managed" \
  --service-account="$SA_EMAIL" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=60s \
  --port=3000 \
  --set-env-vars="NODE_ENV=production,GEMINI_TEXT_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,COOKIE_SECRET=COOKIE_SECRET:latest,FIREBASE_ADMIN_CREDENTIALS=FIREBASE_ADMIN_CREDENTIALS:latest"
```

---

## 6. Verification and Health Checks

Once deployed, retrieve the service URL and verify public endpoints:

```bash
export SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')

# 1. Health check (returns 200 OK)
curl -i "${SERVICE_URL}/api/health"

# 2. Authenticated AI Workspace token gate check
curl -i "${SERVICE_URL}/api/ai-workspace/auth-check"
# Expected response: 401 Unauthorized (when called without Firebase Bearer token)

# 3. Anonymous PDF tool route check (unauthenticated access preserved)
curl -i "${SERVICE_URL}/api/pdf/status"
```

---

## 7. Operational & Security Notes

- **Zero Client Key Exposure**: `GEMINI_API_KEY` is loaded exclusively inside the Node.js server via Cloud Run Secret Manager mounting.
- **Atomic Idempotency**: All multi-turn AI generation requests use deterministic Firestore transactions on `/users/{uid}/workspaces/{workspaceId}/requests/{requestId}`.
- **Distributed Rate Limiting**: Enforces 30 requests / 60 seconds per Firebase UID across all Cloud Run instances.
- **Preserved Cookie Isolation**: Anonymous PDF tools use signed `sid` cookies completely separated from Firebase Auth tokens.
