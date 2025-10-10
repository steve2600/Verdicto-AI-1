#!/bin/bash

# Backend Environment Variables Setup Script
# Generated from Vly for Git Sync
# Run this script to set up your Convex backend environment variables

echo 'Setting up Convex backend environment variables...'

# Check if Convex CLI is installed
if ! command -v npx &> /dev/null; then
    echo 'Error: npx is not installed. Please install Node.js and npm first.'
    exit 1
fi

echo "Setting JWKS..."
npx convex env set "JWKS" -- "{\"keys\":[{\"use\":\"sig\",\"kty\":\"RSA\",\"n\":\"oSFMNJWJMHHFTJZecQ3XUcGfjtJMwoQ0GPpN_U0GIDu_7DLjuxWj_xdpiSOxQINZ4FWQylB2lW0drwXNl-M2pIyDn_JOBi-Z4TyJVYR6GIa-zl6-1ML_51Pq7ruzZ6u_XKBcsqrv0ag5D_xkPznrMbum-zm8S0hnoujPi4vhEuj268mYM3wO6gNdf4s_USwiZJQPnsznQNgta0pXKgO0Iwck2fU8rHoELLguAMPjuFqQpXMoC_MUThKR21NTb6Jfx0Rw4O7h70dllJPIZ-_h_qX_ojpBW9WQWTtPovjTN-Abe2Lj1Dr3FLW4fLkiZCjIHFEcVwtvCD1VJ6qJ5_-g3Q\",\"e\":\"AQAB\"}]}"

echo "Setting JWT_PRIVATE_KEY..."
npx convex env set "JWT_PRIVATE_KEY" -- "-----BEGIN PRIVATE KEY----- MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChIUw0lYkwccVM ll5xDddRwZ+O0kzChDQY+k39TQYgO7/sMuO7FaP/F2mJI7FAg1ngVZDKUHaVbR2v Bc2X4zakjIOf8k4GL5nhPIlVhHoYhr7OXr7Uwv/nU+ruu7Nnq79coFyyqu/RqDkP /GQ/Oesxu6b7ObxLSGei6M+Li+ES6PbryZgzfA7qA11/iz9RLCJklA+ezOdA2C1r SlcqA7QjByTZ9TysegQsuC4Aw+O4WpClcygL8xROEpHbU1Nvol/HRHDg7uHvR2WU k8hn7+H+pf+iOkFb1ZBZO0+i+NM34Bt7YuPUOvcUtbh8uSJkKMgcURxXC28IPVUn qonn/6DdAgMBAAECggEAAiYfSTys4VLXHNCNAPag5mh7jb6aedPJCszzgRs1eeKA +EtsvQXT07JbWDagil5TzhBwXBU9Rw7ShY84N8DSP9jpLqAoVJcBAFZSqv3pxoSa 9Vhqonn9uFvCHiubv+F0LbcsgeMSXlyM4NgFsYbjU5O42xCFl4feERxjiaQCU/lk VqopiJeHSeWdkQRDYxz0NCyuEAMj72vCvbhYyXZEOL/HPAWFXJzqZsbz5fseLa4v F9BYwP45RfV/hGLXNRhD0mv1J1rEo5lkzXkicHUTkHueSVPdeeMv9kjU0+wn5q2V swUONpd3Omx3EQcQ3Gr82z+qwKsKCajDf4QXXsi7wQKBgQDaz+PZW4PjktvRzmAZ jGXzgY7GncFQNFPwT7jodjwAz22lAPiznnGGmJ6H0fYXhRZnHVcFI9a0ZQTmrVCv vLURI8SiT3NB6VDQynS70ZXXpOEMy7O5mjMGxLk6ymg6fMuySm567Tpc4FiNkxzd pQ/Xz8CplMOBnCkWpjUD/oIRwQKBgQC8g8UiYnV1WXaDJiKxNkkrw2lis5lYZLbn XlfYY3LalIyF0QDmcugBphJ8Do9SmoflykJGxTic/PFpT/xgqn5THQf9t2zV9xQp MJxe6n3PGxwUNl9hvf0V9+bQiafRfF+Fmk0T+OPDYMu88YAu7jwkP/vd6Y7yP8Y0 XFxgwu8eHQKBgBjpE/J51bEB1h6zlQMzlaO8OynnacucuXWhTdbBJyGce8oOK0If pqMBGwMxZwfUcfF5SJ/gLaBJ493zGz12iVKTNN6ZlvCJBFdQxStgt+Nd9PUE98gI gwihOskzo9wMuw/oI13BRiSuscYkWmPtV7llAHUN55gI1DCs6Vo0DlDBAoGAQYvD iIAZfRL9LP6eg2VvraLFSsdNozlpiyr3ekqhzbRm48RW/smnN6OJu87IMJ2AcPqR bs/2LkeYnNht1SKSx81JUQNs+Txuqx+2zx3TXqZ7bd+17GNF01Sd0ZZ7XlBTWj3b XP1mHDHUxT5nJmo5SRViOreRt1NLVDtk91PwFlUCgYEAzZWoFmbvq6YsoHWgaY99 VskiA7xG9BedwrEdT2InDhkUXOUa9q8Xuh0oURrDfKell5v2tuJY9FB4ac6qdfbP 59KY6IQh4XrWZpYW1FiNa4S+rKRHpc7eGeiPIHM4WY9QqSA3MnqE1uMdeCAGzS/j OqskUY0gvkUJQsDMcr42mn8"

echo "Setting SITE_URL..."
npx convex env set "SITE_URL" -- "http://localhost:5173"

echo "Setting VLY_APP_NAME..."
npx convex env set "VLY_APP_NAME" -- "LexAI UI"

echo "✅ All backend environment variables have been set!"
echo "You can now run: pnpm dev:backend"
