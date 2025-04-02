# Recursive Learning Lambda Backend

Private backend service for Recursive Learning's context-aware learning management system.

## Architecture Overview

```
                      [ Client: https://recursivelearning.app ]
                                      |
                                      |  OPTIONS /chat
                                      v
+---------------------------------- API Gateway ----------------------------------+
|                                                                                 |
|  Route: OPTIONS /chat                                                           |
|     └──> Integration: MOCK                                                      |
|           └──> Sends CORS headers:                                              |
|                - Access-Control-Allow-Origin: 'https://recursivelearning.app'  |
|                - Access-Control-Allow-Methods: 'POST,OPTIONS'                  |
|                - Access-Control-Allow-Headers: 'Content-Type, Authorization'   |
|                                                                                 |
|  Route: POST /chat                                                              |
|     └──> Integration: AWS_PROXY                                                 |
|           └──> Lambda: rl-lambda-2025                                           |
|                     └──> Handles message + routing logic                        |
+---------------------------------------------------------------------------------+

                                Lambda Logic Summary
                                ---------------------
                                    |
                                    |  Input: 
                                    |    - User_ID
                                    |    - Org_ID
                                    |    - Assistant_ID
                                    |    - Thread_ID
                                    |    - Source
                                    |
                                    v
        +--------------------------------------------------------------+
        | Lambda Function: rl-lambda-2025                              |
        |                                                              |
        | - Validates POST payload                                     |
        | - Pulls secrets (OpenAI Key, etc.) via AWS SSM              |
        | - Interacts with OpenAI API or assistant logic              |
        | - Can query/write to Airtable for context                   |
        | - Responds with assistant-generated message                 |
        +--------------------------------------------------------------+
```

## AWS_PROXY Integration for OPTIONS and POST

### Approach Overview
- Using HTTP API Gateway with AWS_PROXY integration for both POST and OPTIONS requests.
- Lambda function handles OPTIONS preflight requests, returning appropriate CORS headers.

### Benefits
- **Lower Latency and Cost:** HTTP API is faster and less expensive compared to REST API.
- **Simpler Management:** Avoids complexity of MOCK integrations.
- **Unified Logic:** Centralized request processing simplifies routing logic.

### Implementation Changes
- Lambda detects HTTP method and returns proper CORS response for OPTIONS.
- Removed MOCK integration from SAM template; using Lambda proxy integration for all methods.
- Lambda includes required CORS headers in responses.

### Testing and Expected Behavior
- **OPTIONS Requests:** Lambda returns 200 with CORS headers.
- **POST Requests:** Lambda processes payload, routes requests, and returns structured JSON response.
- **Error Handling:** Lambda returns descriptive errors for missing fields or internal issues.

### Next Steps
- Implement Lambda changes and redeploy.
- Run unit tests to confirm behavior.
- Verify OPTIONS and POST requests with tools like Postman or curl.

## Testing Strategy

### Phase 1: CORS Preflight (MOCK Integration)
1. Test OPTIONS Request
   ```bash
   curl -X OPTIONS $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v
   ```
   Expected Response:
   - Status: 200 OK
   - Headers:
     ```
     Access-Control-Allow-Origin: https://recursivelearning.app
     Access-Control-Allow-Methods: POST,OPTIONS
     Access-Control-Allow-Headers: Content-Type,Authorization
     Access-Control-Max-Age: 300
     ```

### Phase 2: Chat Endpoint (AWS_PROXY Integration)
1. Test POST Request
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Content-Type: application/json" \
     -d '{
       "User_ID": "test_user",
       "Org_ID": "test_org",
       "Assistant_ID": "asst_123",
       "Thread_ID": "thread_456",
       "Source": "goalsetter"
     }' \
     -v
   ```
   Expected Response:
   - Status: 200 OK
   - Body: Assistant-generated message

### Phase 3: Error Cases
1. Invalid Origin
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://unauthorized-domain.com" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test"}' \
     -v
   ```
   Expected: CORS error

2. Missing Required Fields
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test"}' \
     -v
   ```
   Expected: 400 Bad Request

## Request/Response Schema

### POST /chat Request
```json
{
  "User_ID": "string",
  "Org_ID": "string",
  "Assistant_ID": "string",
  "Thread_ID": "string",
  "Source": "string"
}
```

### POST /chat Response
```json
{
  "message": "string",
  "thread_id": "string",
  "assistant_id": "string"
}
```

### OPTIONS /chat Response
- Status: 200 OK
- Headers:
  ```
  Access-Control-Allow-Origin: https://recursivelearning.app
  Access-Control-Allow-Methods: POST,OPTIONS
  Access-Control-Allow-Headers: Content-Type,Authorization
  Access-Control-Max-Age: 300
  ```

## Security Diagnostics Checklist

### IAM & Permissions
- [x] Lambda execution role exists and has correct permissions
- [x] API Gateway has permission to invoke Lambda
- [x] Lambda has permission to access SSM Parameter Store
- [x] Lambda has permission to write CloudWatch logs

### API Gateway Security
- [x] CORS configuration is properly set up
- [x] Allowed origins are explicitly defined
- [x] Required methods are allowed (POST, OPTIONS)
- [x] Required headers are allowed
- [x] API Gateway stage is configured

### Lambda Security
- [x] Lambda function exists and is properly configured
- [x] Lambda timeout is set appropriately (180s)
- [x] Lambda memory allocation is sufficient (256MB)
- [x] Lambda environment variables are properly set

### Common Security Issues
- [x] No wildcard CORS origins
- [x] No hardcoded credentials
- [x] Proper IAM role permissions
- [x] API Gateway authentication configured

## Build Status (April 1, 2024)

✅ Initial Setup Complete
- Node.js Lambda with SAM template
- CORS and API Gateway configuration
- SSM parameter access
- OpenAI Assistants API integration
- Airtable LRS logging

## Development Status
🚧 Under active development

## Security Notes
- Private repository
- SSM Parameter Store for secrets
- CORS enabled for specific origins
- IAM roles for Lambda execution

## Monitoring
- CloudWatch Logs
- Airtable LRS table for analytics
- OpenAI usage tracking