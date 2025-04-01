# Recursive Learning Lambda Backend

Private backend service for Recursive Learning's context-aware learning management system.

## Build Status (April 1, 2024)

✅ Initial Setup Complete
- Node.js Lambda with SAM template
- CORS and API Gateway configuration
- SSM parameter access
- OpenAI Assistants API integration
- Airtable LRS logging

## Security Diagnostics Checklist

### IAM & Permissions
- [x] Lambda execution role exists and has correct permissions
- [x] API Gateway has permission to invoke Lambda
- [x] Lambda has permission to access SSM Parameter Store
- [x] Lambda has permission to write CloudWatch logs

### API Gateway Security
- [x] CORS configuration is properly set up
- [x] Allowed origins are explicitly defined
- [x] Required methods are allowed (GET, POST, OPTIONS)
- [x] Required headers are allowed
- [x] API Gateway stage is configured

### Lambda Security
- [x] Lambda function exists and is properly configured
- [x] Lambda timeout is set appropriately
- [x] Lambda memory allocation is sufficient
- [x] Lambda environment variables are properly set

### Common Security Issues
- [x] No wildcard CORS origins
- [x] No hardcoded credentials
- [x] Proper IAM role permissions
- [x] API Gateway authentication configured

### Diagnostic Steps
- [x] Verify IAM role permissions
- [x] Check API Gateway configuration
- [x] Verify Lambda permissions
- [x] Validate CORS settings
- [x] Check usage plans and throttling

### Testing Steps
- [ ] Test OPTIONS request for CORS preflight
- [ ] Test POST request to /chat endpoint
- [ ] Verify response headers include CORS
- [ ] Test with different allowed origins
- [ ] Verify error handling

## API Testing

Let's test the API endpoint with curl commands:

1. Test CORS preflight (OPTIONS request):
```bash
curl -X OPTIONS https://yotef1gslf.execute-api.us-east-2.amazonaws.com/chat \
  -H "Origin: https://recursivelearning.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

2. Test chat endpoint (POST request):
```bash
curl -X POST https://yotef1gslf.execute-api.us-east-2.amazonaws.com/chat \
  -H "Origin: https://recursivelearning.app" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}' \
  -v
```

3. Test with different origin (should fail):
```bash
curl -X POST https://yotef1gslf.execute-api.us-east-2.amazonaws.com/chat \
  -H "Origin: https://unauthorized-domain.com" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}' \
  -v
```

Would you like me to execute these test commands to verify the API is working correctly?

## Build Checklist

1️⃣ Local Development Setup
- [ ] Configure AWS credentials
```bash
aws configure  # Set region to us-east-2
```
- [ ] Install dependencies
```bash
npm install
```
- [ ] Set up SSM parameters in AWS console:
  - `integraled/central/OpenAI_API_Key`
  - `integraled/central/Airtable_API_Key`
  - `integraled/central/Airtable_Base_ID`

2️⃣ SAM Template Configuration
- [ ] Verify template.yaml settings:
  - Function name: `rl-lambda-2025`
  - Memory: 256MB
  - Timeout: 180s
  - Runtime: Node.js 18.x
  - Architecture: ARM64
- [ ] Check API Gateway configuration:
  - CORS settings
  - Endpoint path: `/chat`
  - Method: POST
- [ ] Validate SSM parameter permissions

3️⃣ Build and Deploy
```bash
# Build the application
sam build

# Validate the template
sam validate

# Deploy (first time)
sam deploy --guided
```
- Stack name: `rl-lambda-2025`
- Region: `us-east-2`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to configuration file: `Y`

4️⃣ Test Deployment
Use test script from frontend repo:
```bash
cd ../rl-frontend/03_reference
./test-pdf-webhook.sh
```

Expected test cases:
- [ ] StriveTogether Goal Setter Webhook
- [ ] Webhook Data Structure Test
- [ ] Error Case - Missing Fields

Initial Assistant Tests:
```json
// Goal Setter Assistant Test
{
  "intake_token": "goalsetter_chat",
  "name": "Test Teacher",
  "email": "teacher@school.edu",
  "assistant_id": "asst_IA5PsJxdShVPTAv2xeXTr4Ma",
  "subject_and_grade": "9th Grade Algebra",
  "message": "Hi I'm here to set goals for 9th grade algebra",
  "org_id": "recsK5zK0CouK5ebW",
  "url": "https://recursivelearning.app/clients/st/goalsetter_live.html"
}

// BBH Assistant Test
{
  "User_ID": "test_user",
  "Org_ID": "bbh_org",
  "Assistant_ID": "asst_bbh_sleep",
  "message": "I have questions about my baby's sleep",
  "url": "https://recursivelearning.app/clients/bbh/sleep_live.html"
}
```

5️⃣ URL Pattern Testing
Test each URL pattern:

StriveTogether Goal Setter:
- [ ] `goalsetter_live.html` - Production end-user
- [ ] `goalsetter_temp.html` - Development
- [ ] `goalsetter_review.html` - Review mode
- [ ] `goalsetter.html` - Production

BBH Sleep Support:
- [ ] `sleep_live.html` - Production end-user
- [ ] `sleep_temp.html` - Development
- [ ] `sleep_review.html` - Review mode
- [ ] `sleep.html` - Production

6️⃣ Monitoring Setup
- [ ] CloudWatch Logs enabled
- [ ] Airtable LRS table configured
- [ ] OpenAI usage tracking

## Architecture

```
Frontend Pages → Lambda → OpenAI Assistants API
                    ↓
              Airtable (LRS)
```

## URL Handoff Protocols

### Goal Setter Page Flow
```
goalsetter_live.html (stable URL)
    ↓
goalsetter.html (production)
    ↓
goalsetter_temp.html (development)
    ↓
goalsetter_review.html (review)
```

### URL Patterns
- `*_live.html`: Production end-user interface
- `*_temp.html`: Development/testing interface
- `*_review.html`: Review/feedback interface
- `*.html`: Production interface

## Build Process

1. Local Development
```bash
npm install
npm test  # TODO: Add test suite
```

2. SAM Build Process
```bash
# Clean any previous builds
rm -rf .aws-sam

# Build the application
sam build

# Validate the template
sam validate

# Deploy (first time)
sam deploy --guided

# Subsequent deployments
sam deploy
```

3. AWS Lambda Configuration (via template.yaml)
- Runtime: Node.js 18.x
- Handler: index.handler
- Region: us-east-2
- Memory: 256MB
- Timeout: 180s
- Architecture: ARM64

## Environment Variables (SSM Parameters)
- `integraled/central/OpenAI_API_Key`
- `integraled/central/Airtable_API_Key`
- `integraled/central/Airtable_Base_ID`

## API Endpoints

### POST /chat
Handles both goal setter and standard chat formats.

#### Goal Setter Format
```json
{
  "intake_token": "goalsetter_chat",
  "name": "string",
  "email": "string",
  "user_id": "string",
  "thread_id": "string",
  "assistant_id": "string",
  "subject_and_grade": "string",
  "learning_target": "string",
  "measure_of_success": "string",
  "classroom_goal_statement": "string",
  "org_id": "string",
  "source": "string",
  "url": "string"
}
```

#### Standard Chat Format
```json
{
  "User_ID": "string",
  "Org_ID": "string",
  "Assistant_ID": "string",
  "Thread_ID": "string",
  "message": "string",
  "url": "string"
}
```

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