# Recursive Learning Lambda Backend

Private backend service for Recursive Learning's context-aware learning management system. Handles secure communication between frontend pages and OpenAI Assistants API.

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

2. Deployment Package
```bash
zip -r function.zip index.js node_modules/
```

3. AWS Lambda Configuration
- Runtime: Node.js 18.x
- Handler: index.handler
- Region: us-east-2
- Memory: 256MB
- Timeout: 30s

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

## Security
- Private repository
- SSM Parameter Store for secrets
- CORS enabled for specific origins
- IAM roles for Lambda execution

## Monitoring
- CloudWatch Logs
- Airtable LRS table for analytics
- OpenAI usage tracking

## Development Status
🚧 Under active development 