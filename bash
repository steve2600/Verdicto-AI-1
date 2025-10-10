# Clone your new Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/verdicto-ml-backend
cd verdicto-ml-backend

# Copy ML backend files
cp -r /path/to/src/backend/ml/* .

# Commit and push
git add .
git commit -m "Initial ML backend deployment"
git push
