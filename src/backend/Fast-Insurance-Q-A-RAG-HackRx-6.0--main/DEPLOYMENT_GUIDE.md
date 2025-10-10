# RAG Backend Deployment Guide

## 🚀 Railway Deployment

### Required Environment Variables

Set these in your Railway project settings:

```bash
# Voyage AI API Key (for embeddings)
VOYAGE_API_KEY=your_voyage_api_key_here

# Groq API Key (for LLM queries)  
GROQ_API_KEY=your_groq_api_key_here

# Weaviate URL (for vector storage)
WEAVIATE_URL=your_weaviate_url_here

# Team token for authentication
TEAM_TOKEN=8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8
```

### Deployment Steps

1. **Connect to Railway**:
   - Go to Railway dashboard
   - Create new project
   - Connect your GitHub repository
   - Select the `src/backend/Fast-Insurance-Q-A-RAG-HackRx-6.0--main` directory

2. **Set Environment Variables**:
   - Go to your Railway project settings
   - Add all required environment variables listed above

3. **Deploy**:
   - Railway will automatically build and deploy using the Dockerfile
   - The app will be available at your Railway URL

### Health Check

Once deployed, test the health endpoint:
```bash
curl https://your-railway-url.railway.app/ping
```

Expected response:
```json
{
  "status": "ultra-fast",
  "mode": "lightning"
}
```

### API Endpoints

- `POST /api/v1/documents/ingest` - Document ingestion
- `POST /api/v1/analysis/query` - Query processing
- `GET /ping` - Health check
- `GET /health` - Detailed health info

## 🔧 Local Development

### Prerequisites

```bash
pip install -r requirements.txt
```

### Environment Setup

Create a `.env` file with the required variables:

```bash
VOYAGE_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
WEAVIATE_URL=your_url_here
TEAM_TOKEN=8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8
```

### Run Locally

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## 🐛 Troubleshooting

### Common Issues

1. **502 Bad Gateway**: 
   - Check environment variables are set
   - Verify all required APIs are accessible
   - Check Railway logs for startup errors

2. **Connection Refused**:
   - Ensure the app is binding to `0.0.0.0` not `localhost`
   - Check port configuration

3. **Missing Dependencies**:
   - Verify all packages in requirements.txt are installed
   - Check Docker build logs

### Logs

Check Railway deployment logs for detailed error information.

## 📝 Notes

- The backend now includes the `/api/v1/hackrx/ingest` endpoint for document processing
- All endpoints require the `TEAM_TOKEN` in the Authorization header
- The app uses semantic similarity for document chunking
- Supports PDF, DOCX, and email document types
