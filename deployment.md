# AUTHENTIX Deployment Guide

This guide deploys the three AUTHENTIX components separately:

- FastAPI backend to Google Cloud Run
- `TransactionAuthorization` contract to the Ethereum Sepolia testnet
- React/Vite frontend to Vercel

AUTHENTIX is a demo authorization system. It does not transfer money. The smart contract records a transaction hash, wallet address, decision, timestamp, and safe metadata only.

## Deployment order

Deploy in this order so each service has the URL or address required by the next one:

1. Prepare credentials and repositories.
2. Configure MongoDB Atlas.
3. Deploy the smart contract to Sepolia.
4. Deploy the backend to Cloud Run.
5. Deploy the frontend to Vercel.
6. Configure MetaMask and run an end-to-end test.

## Important security warning

The repository has previously contained live-looking credentials in local `.env` files. Never commit those files. If a MongoDB password, Reality Defender API key, RPC key, or private key has been shared or committed, rotate it before deployment.

Use a dedicated test wallet for Sepolia. Never use a wallet private key that holds real assets.

The deployer private key is used only by Hardhat during contract deployment. It must never be added to Vercel or Cloud Run.

## Prerequisites

Install or create accounts for:

- Node.js 20 or later and npm
- Python 3.11 or later
- Google Cloud CLI (`gcloud`)
- A Google Cloud project with billing enabled
- A MongoDB Atlas cluster and database user
- A Reality Defender API key for live analysis
- A Sepolia RPC provider URL, such as Alchemy, Infura, or another provider
- A Sepolia test wallet funded with Sepolia ETH
- A Vercel account
- MetaMask configured for Sepolia

Authenticate the Google Cloud CLI and select the project:

```powershell
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
```

Set local deployment variables in PowerShell. Replace every placeholder before running commands:

```powershell
$PROJECT_ID = "YOUR_GCP_PROJECT_ID"
$REGION = "us-central1"
$SERVICE = "authentix-api"
$REPO = "authentix"
$BACKEND_URL = "https://PLACEHOLDER.run.app"
```

Enable the Google APIs used by this guide:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

## 1. Configure MongoDB Atlas

### Create the database user

In Atlas:

1. Open **Database Access**.
2. Create a dedicated application user.
3. Give it access to the `authentix` database. For a demo, read/write access to that database is sufficient.
4. Generate a strong password.
5. URL-encode special characters in the password before putting it into a MongoDB URI. For example, `@` becomes `%40`.

### Allow Cloud Run to connect

Cloud Run normally uses dynamic outbound IP addresses. The simple demo configuration is:

1. Open **Network Access** in Atlas.
2. Add `0.0.0.0/0`.
3. Keep database authentication enabled with the dedicated user.

This allows connections from any IP, so use a least-privilege database user and rotate credentials. For a production deployment, use a VPC connector and controlled egress with a static outbound IP, then allow only that IP in Atlas.

Copy the Atlas connection string. It should look similar to:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

The database name is supplied separately through `MONGODB_DB=authentix`.

## 2. Deploy the contract to Sepolia

The contract deployment is configured in [blockchain/hardhat.config.ts](blockchain/hardhat.config.ts). The existing `deploy` script targets the `sepolia` network and reads:

- `SEPOLIA_RPC_URL`
- `PRIVATE_KEY`

### Prepare the deployer wallet

Use a new test wallet or a dedicated deployment account. Fund it with Sepolia ETH from a reputable Sepolia faucet. Do not use a mainnet private key.

From the `blockchain` directory, create a local `.env` file that is ignored by Git:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_RPC_KEY
PRIVATE_KEY=YOUR_SEPOLIA_TEST_WALLET_PRIVATE_KEY
```

Check that `blockchain/.gitignore` or the repository ignore rules exclude `.env`. Never paste this private key into Vercel, Cloud Run, GitHub, or the frontend.

Install dependencies and deploy:

```powershell
cd blockchain
npm install
npm run compile
npm run deploy
```

The command prints:

```text
TransactionAuthorization deployed to: 0x...
```

Save this address as `CONTRACT_ADDRESS`. Also save the deployment transaction hash if you want to verify it later.

Verify the contract on Sepolia Etherscan if your RPC provider and explorer workflow support it. At minimum, open the contract address on:

```text
https://sepolia.etherscan.io/address/CONTRACT_ADDRESS
```

### Sepolia wallet settings

MetaMask should use:

```text
Network: Sepolia
Chain ID: 11155111
Currency: SepoliaETH
```

The frontend calls `authorize(bytes32,bool,string)` on the deployed address. The connected MetaMask account needs Sepolia ETH for the contract transaction.

## 3. Prepare the backend for Cloud Run

Cloud Run must listen on all interfaces and on the port provided in the `PORT` environment variable. Add this file at `backend/Procfile`:

```text
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Do not put secrets in the Procfile.

The backend reads these settings in [backend/app/core/config.py](backend/app/core/config.py):

```env
MONGODB_URI=
MONGODB_DB=authentix
REALITY_DEFENDER_MODE=real
REALITY_DEFENDER_API_KEY=
REALITY_DEFENDER_POLL_SECONDS=2
CORS_ORIGINS=
```

`CORS_ORIGINS` must contain the exact Vercel origin after the frontend is deployed. For an initial deployment, use the temporary Vercel URL. If you later attach a custom domain, add that origin too, separated by commas:

```env
CORS_ORIGINS=https://your-project.vercel.app,https://app.example.com
```

Do not add a trailing slash to the origin.

### Recommended: store secrets in Secret Manager

Create secrets from your local PowerShell session. The values are sent to Google Cloud but are not stored in Git:

```powershell
$MONGODB_URI = "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
$REALITY_DEFENDER_API_KEY = "YOUR_REALITY_DEFENDER_API_KEY"

$MONGODB_URI | gcloud secrets create authentix-mongodb-uri --data-file=-
$REALITY_DEFENDER_API_KEY | gcloud secrets create authentix-reality-defender-key --data-file=-
```

If a secret already exists, create a new version instead:

```powershell
$MONGODB_URI | gcloud secrets versions add authentix-mongodb-uri --data-file=-
$REALITY_DEFENDER_API_KEY | gcloud secrets versions add authentix-reality-defender-key --data-file=-
```

Grant the Cloud Run runtime service account permission to read them. The default Compute Engine service account is commonly used, but confirm the account shown by your project:

```powershell
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$RUNTIME_SA = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding authentix-mongodb-uri `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding authentix-reality-defender-key `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/secretmanager.secretAccessor"
```

### Deploy the backend

From the repository root, deploy the `backend` directory as the Cloud Run source:

```powershell
gcloud run deploy $SERVICE `
  --source .\backend `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars="MONGODB_DB=authentix,REALITY_DEFENDER_MODE=real,REALITY_DEFENDER_POLL_SECONDS=2,CORS_ORIGINS=https://your-project.vercel.app" `
  --set-secrets="MONGODB_URI=authentix-mongodb-uri:latest,REALITY_DEFENDER_API_KEY=authentix-reality-defender-key:latest"
```

Cloud Run builds the Python service from `requirements.txt` and uses the `Procfile` entrypoint. When prompted, allow Cloud Build and Artifact Registry permissions if this is the first deployment.

After deployment, copy the service URL:

```powershell
$BACKEND_URL = gcloud run services describe $SERVICE --region $REGION --format="value(status.url)"
$BACKEND_URL
```

Check the public health endpoint in a browser:

```text
https://YOUR_CLOUD_RUN_URL/health
```

Expected response:

```json
{ "status": "ok", "realityDefenderMode": "real" }
```

The API base URL for the frontend is the Cloud Run URL plus `/api/v1`:

```text
https://YOUR_CLOUD_RUN_URL/api/v1
```

### Updating backend CORS later

When Vercel gives you a final deployment URL or you add a custom domain, redeploy the Cloud Run service with the exact origin:

```powershell
gcloud run services update $SERVICE `
  --region $REGION `
  --update-env-vars="CORS_ORIGINS=https://your-project.vercel.app,https://app.example.com"
```

The backend reads settings during process startup, so restart/redeploy after changing environment variables.

## 4. Deploy the frontend to Vercel

The frontend reads these Vite variables at build time:

```env
VITE_API_URL=https://YOUR_CLOUD_RUN_URL/api/v1
VITE_CONTRACT_ADDRESS=0xYOUR_SEPOLIA_CONTRACT_ADDRESS
```

`VITE_` variables are public and are bundled into browser JavaScript. Only put public values here. Never put the MongoDB URI, Reality Defender key, RPC provider secret, or any private key in Vercel frontend variables.

### Deploy with the Vercel dashboard

1. Push the repository to your Git provider if it is not already there.
2. In Vercel, choose **Add New Project**.
3. Import the repository.
4. Set **Root Directory** to `frontend`.
5. Keep the framework preset as **Vite**.
6. Add these environment variables for Preview and Production:
   - `VITE_API_URL`: `https://YOUR_CLOUD_RUN_URL/api/v1`
   - `VITE_CONTRACT_ADDRESS`: the Sepolia contract address
7. Deploy.

### Deploy with the Vercel CLI

From the `frontend` directory:

```powershell
npm install
npx vercel login
npx vercel
```

When asked for the project settings, use the `frontend` directory as the project root. Add variables in the Vercel dashboard, or use the CLI for the target environment:

```powershell
npx vercel env add VITE_API_URL production
npx vercel env add VITE_CONTRACT_ADDRESS production
npx vercel --prod
```

Vercel will print the deployment URL. Add that exact URL to Cloud Run `CORS_ORIGINS`, then redeploy or update the backend as described above.

### Vercel build settings

The repository already defines the build command in `frontend/package.json`:

```text
npm run build
```

The output directory is:

```text
dist
```

If Vercel does not detect these automatically, set:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## 5. End-to-end verification

### Backend and database

1. Open `https://YOUR_CLOUD_RUN_URL/health`.
2. Confirm the response says `"realityDefenderMode":"real"`.
3. Open Atlas and select the `authentix` database.
4. Confirm the `transactions` and `audit_events` collections appear after the first request.

Do not expect a transaction document to update when only editing the form. Each Analyze request creates a new transaction document.

### Frontend analysis

1. Open the Vercel URL.
2. Select a labelled audio file supported by Reality Defender and smaller than 20 MB.
3. Enter the transaction details.
4. Select the appropriate scenario and risk signals.
5. Click **Analyze request**.
6. Confirm the response is labelled **Live Reality Defender analysis**.
7. Confirm a new transaction appears in Atlas with the submitted flags.

The backend-generated hash uses exactly:

- `amount`
- `currency`
- `beneficiary`
- `beneficiaryAccount`

Risk flags, audio, analysis results, wallet information, and timestamps are not part of that hash.

### MetaMask authorization

1. Open MetaMask on the Sepolia network.
2. Connect the executive wallet in AUTHENTIX.
3. Analyze a high-risk transaction so its status becomes `verification_required`.
4. Click **Approve as executive** or **Deny request**.
5. Approve the signature request for the exact backend-generated hash.
6. Approve the Sepolia contract transaction.
7. Wait for confirmation.
8. Confirm the UI status becomes `recorded`.
9. Confirm the blockchain transaction hash appears in Atlas and open it on Sepolia Etherscan.

The contract prevents recording the same transaction hash more than once. Use a new transaction request for each test.

## Common problems

### `Failed to fetch`

Usually the browser cannot reach the backend. Check:

- The Cloud Run URL is correct.
- `VITE_API_URL` ends with `/api/v1`.
- The Cloud Run service allows unauthenticated invocation.
- `CORS_ORIGINS` exactly matches the Vercel origin.
- The backend has been redeployed after changing CORS.
- The Cloud Run service is running and `/health` responds.

### Cloud Run returns 502 or does not become ready

Check Cloud Run logs:

```powershell
gcloud run services logs read $SERVICE --region $REGION --limit 100
```

The process must bind to `0.0.0.0` and `$PORT`. Confirm `backend/Procfile` exists and contains the Cloud Run entrypoint.

### Atlas connection failures

Check:

- Atlas Network Access allows Cloud Run’s egress.
- The username and password are correct.
- Special password characters are URL-encoded.
- The database user can read and write the `authentix` database.
- The URI is stored in the `MONGODB_URI` secret, not `GODB_URI` or another misspelled variable.

### Reality Defender errors

Check:

- `REALITY_DEFENDER_MODE=real`.
- The API key is valid and stored in Cloud Run’s `REALITY_DEFENDER_API_KEY` secret.
- The selected file has a supported audio extension.
- The file is no larger than 20 MB.
- The request contains both `audioBase64` and `audioFilename`.
- Cloud Run logs do not show SDK upload or polling errors.

### MetaMask cannot connect or the contract call fails

Check:

- MetaMask is on Sepolia, chain ID `11155111`.
- `VITE_CONTRACT_ADDRESS` is the deployed Sepolia address, not the local Hardhat address.
- The wallet has Sepolia ETH.
- The contract address has code on Sepolia Etherscan.
- The Cloud Run backend and Vercel frontend are using the same current deployment configuration.

### Duplicate authorization

The contract rejects a second authorization for the same transaction hash. Analyze a new transaction or change one of the four hashed transaction fields.

## Operations and redeployment

### Deploy a backend revision

After backend code or dependency changes:

```powershell
gcloud run deploy $SERVICE `
  --source .\backend `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars="MONGODB_DB=authentix,REALITY_DEFENDER_MODE=real,REALITY_DEFENDER_POLL_SECONDS=2,CORS_ORIGINS=https://your-project.vercel.app" `
  --set-secrets="MONGODB_URI=authentix-mongodb-uri:latest,REALITY_DEFENDER_API_KEY=authentix-reality-defender-key:latest"
```

### Deploy a frontend revision

Push changes to the connected Git repository and let Vercel create a deployment, or run:

```powershell
cd frontend
npx vercel --prod
```

Because Vite embeds `VITE_` values at build time, trigger a new Vercel deployment after changing the backend URL or contract address.

### Rotate credentials

1. Create a new MongoDB database password or Reality Defender key.
2. Add a new Secret Manager version.
3. Redeploy Cloud Run.
4. Revoke the old credential.
5. Check Git history and remove exposed credentials from access where appropriate.

## Deployment checklist

- [ ] Local secrets rotated and excluded from Git.
- [ ] Atlas user created with database-scoped permissions.
- [ ] Atlas network access configured for Cloud Run.
- [ ] Sepolia deployer wallet created and funded with test ETH.
- [ ] Contract deployed and address saved.
- [ ] `backend/Procfile` added with the Cloud Run entrypoint.
- [ ] Cloud Run secrets created and attached.
- [ ] Cloud Run `/health` endpoint returns successfully.
- [ ] Vercel root directory is `frontend`.
- [ ] Vercel `VITE_API_URL` points to Cloud Run `/api/v1`.
- [ ] Vercel `VITE_CONTRACT_ADDRESS` points to the Sepolia contract.
- [ ] Cloud Run CORS matches the Vercel origin exactly.
- [ ] A labelled audio file produces a live analysis.
- [ ] A high-risk transaction can be authorized on Sepolia.
- [ ] Atlas contains the transaction and audit event records.
