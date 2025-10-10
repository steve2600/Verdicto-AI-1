# Hugging Face Spaces entry point
import os
from api import app

# This file is used by Hugging Face Spaces to start the application
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))  # HF Spaces default port
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
