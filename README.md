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

## 🎉 Successful Deployment (April 2024)

### Unified AWS_PROXY Integration
- Successfully deployed HTTP API Gateway with AWS_PROXY integration for both OPTIONS and POST requests.
- Lambda function now handles OPTIONS preflight requests directly, simplifying CORS management.

### Key Benefits
- **Lower Latency and Cost:** Efficient HTTP API usage.
- **Simplified Management:** Unified integration reduces complexity.
- **Centralized Logic:** Easier maintenance and clearer routing logic.

### Next Steps
- Verify OPTIONS and POST requests functionality.
- Document test results and continue monitoring performance.
- Maintain clear documentation and update regularly based on learnings.

## 🚀 Frontend-Backend Handshake Documentation (April 2024)

### Endpoint Information

**API Endpoint:**
```
POST https://c6qevynchf.execute-api.us-east-2.amazonaws.com/chat
OPTIONS https://c6qevynchf.execute-api.us-east-2.amazonaws.com/chat
```

**Integration Type:** AWS_PROXY (Unified for both OPTIONS and POST)

### ✅ Frontend Request Schema (JSON)

```json
{
  "User_ID": "user_123",
  "Org_ID": "org_456",
  "Assistant_ID": "asst_789",
  "Thread_ID": null,
  "Source": "goalsetter_live",
  "message": "Hello, assistant!"
}
```

### Field Descriptions & Sensitivities:
- **User_ID** *(required, string)*: Unique identifier for the user.
- **Org_ID** *(required, string)*: Identifier for the user's organization.
- **Assistant_ID** *(required, string)*: Identifier for the specific assistant.
- **Thread_ID** *(optional, string or null)*: Conversation thread identifier; use `null` explicitly for new threads.
- **Source** *(required, string)*: Origin of the request (e.g., `goalsetter_live`).
- **message** *(required, string)*: User's message to the assistant.

### ✅ Backend Response Schema (JSON)

```json
{
  "message": "Assistant-generated response here",
  "thread_id": "thread_101112",
  "assistant_id": "asst_789"
}
```

### 🔄 OPTIONS Request (CORS Preflight)

Lambda directly handles OPTIONS requests, returning:
```
Access-Control-Allow-Origin: https://recursivelearning.app
Access-Control-Allow-Methods: POST,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Max-Age: 300
```

### 🛠️ Example Frontend Request (curl)

```bash
curl -X POST https://c6qevynchf.execute-api.us-east-2.amazonaws.com/chat \
  -H "Origin: https://recursivelearning.app" \
  -H "Content-Type: application/json" \
  -d '{
    "User_ID": "user_123",
    "Org_ID": "org_456",
    "Assistant_ID": "asst_789",
    "Thread_ID": null,
    "Source": "goalsetter_live",
    "message": "Hello, assistant!"
  }' \
  -v
```

### 🎯 Goalsetter Activity Example

```json
{
  "User_ID": "teacher_001",
  "Org_ID": "school_abc",
  "Assistant_ID": "asst_goalsetter",
  "Thread_ID": null,
  "Source": "goalsetter_live",
  "message": "I want to set goals for my 9th-grade algebra class."
}
```

### 🧪 Suggested Unit Testing

```yaml
tests:
  - name: "OPTIONS Request Test"
    input:
      httpMethod: "OPTIONS"
      requestContext:
        http:
          method: "OPTIONS"
    expectedOutput:
      statusCode: 200
      headers:
        Access-Control-Allow-Origin: "https://recursivelearning.app"
        Access-Control-Allow-Methods: "POST,OPTIONS"
        Access-Control-Allow-Headers: "Content-Type,Authorization"
        Access-Control-Max-Age: "300"
      body: '{"message": "CORS preflight response"}'

  - name: "POST Request Valid Payload Test"
    input:
      httpMethod: "POST"
      body: '{"User_ID": "user123", "Org_ID": "org456", "Assistant_ID": "asst789", "Thread_ID": null, "Source": "goalsetter_live", "message": "Hello"}'
      requestContext:
        http:
          method: "POST"
    expectedOutput:
      statusCode: 200
      bodyContains: ["user123", "asst789", "Hello"]

  - name: "POST Request Missing Required Fields Test"
    input:
      httpMethod: "POST"
      body: '{"message": "Hello"}'
      requestContext:
        http:
          method: "POST"
    expectedOutput:
      statusCode: 400
      bodyContains: ["Missing required parameters"]
```

### ✅ Next Steps for Frontend Team:
- Confirm frontend requests match the schema.
- Verify OPTIONS preflight handling.
- Coordinate initial integration testing.
- Prepare for live assistant interactions post-testing.

## API Gateway CORS Configuration

This configuration ensures our HTTP API Gateway correctly forwards CORS headers to clients, even if our Lambda function does not include them in its response. Key points:

- **Allowed Origins:** Only requests from `https://recursivelearning.app` are permitted.
- **Allowed Methods:** Only `POST` and `OPTIONS` requests are allowed.
- **Allowed Headers:** Must include `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`.
- **Max Age:** Preflight requests are cached for 300 seconds to reduce network overhead.

By setting these parameters in the API Gateway's `CorsConfiguration` block, we ensure OPTIONS (preflight) requests return the expected CORS headers, and all client requests are correctly validated and routed to our Lambda function. This maintains performance and cost benefits while providing full control over CORS behavior.