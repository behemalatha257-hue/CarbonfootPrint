# EcoStep Carbon Footprint Tracker

A personal carbon footprint tracking web app with interactive estimate forms, AI eco-coaching, habit builder, offset marketplace, and personalized challenges.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm start
   ```
3. Open `http://localhost:8080`

## Testing

- Run all tests:
  ```bash
  npm test
  ```
- Run specific tests:
  ```bash
  npm run test:calculations
  npm run test:server
  ```

## GCP Deployment

The project includes a `Dockerfile` and `cloudbuild.yaml`.

1. Build and push with Cloud Build:
   ```bash
   gcloud builds submit --config cloudbuild.yaml .
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy carbon-footprint-tracker \
     --image gcr.io/$PROJECT_ID/carbon-footprint-tracker:$SHORT_SHA \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080
   ```

## Notes for Quality and Safety

- Uses Express with `x-powered-by` disabled.
- Validates inputs and protects against large JSON payloads.
- Implements modular frontend structure with storage, calculations, and UI separated.
- Includes both calculation engine and server API tests.
