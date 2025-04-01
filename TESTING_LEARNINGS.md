# Testing Learnings & Strategy

## Known Failure Points & Solutions

### 1. API Gateway Configuration
- [x] Cannot use wildcards in CORS origins
- [x] Response parameters must be JSON objects with format: `{"value": "string"}`
- [x] Integration types must be properly specified (AWS_PROXY vs MOCK)
- [x] Lambda permissions must be explicitly granted
- [x] Stage must be created before routes
- [x] ResponseTemplates not allowed in MOCK integrations

### 2. Lambda Integration
- [x] Lambda ARN must be correct and function must exist
- [x] Lambda must have permission to be invoked by API Gateway
- [x] Lambda timeout must be sufficient (180s)
- [x] Lambda memory must be sufficient (256MB)
- [x] Lambda must handle both OPTIONS and POST methods

### 3. CORS Configuration
- [x] Must specify exact origins, no wildcards
- [x] Must include all required headers
- [x] Must handle OPTIONS preflight requests
- [x] Must set correct MaxAge value
- [x] Response headers must be properly formatted JSON objects

## Current Status
- [x] Identified all failure points
- [x] Fixed template.yaml configuration
- [x] Enhanced Lambda logging
- [ ] Ready for deployment and testing

## Testing Strategy

### Phase 1: Infrastructure Validation (Current Phase)
1. Deploy API Gateway
   ```bash
   sam build && sam deploy --guided
   ```
   - Expected: Success
   - Next: Check API endpoint in AWS Console
   - Log: API ID and endpoint URL
   - Validation: Verify API Gateway is created with correct CORS settings

2. Verify Lambda Integration
   - Expected: Success
   - Next: Verify Lambda permissions
   - Log: Lambda ARN and permissions
   - Validation: Check Lambda function exists and has correct permissions

3. Verify CORS Configuration
   - Expected: Success
   - Next: Test OPTIONS request
   - Log: CORS headers in response
   - Validation: Confirm CORS settings in API Gateway console

### Phase 2: Endpoint Testing (Next Phase)
1. Test OPTIONS Request
   ```bash
   curl -X OPTIONS $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v
   ```
   - Expected: 200 OK with CORS headers
   - Next: Test POST request
   - Log: Response headers and status
   - Validation: Check CloudWatch logs for request/response

2. Test POST Request (Goal Setter)
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Content-Type: application/json" \
     -d '{
       "intake_token": "goalsetter_chat",
       "name": "Test Teacher",
       "email": "teacher@school.edu",
       "user_id": "test123",
       "thread_id": "thread123",
       "assistant_id": "asst_IA5PsJxdShVPTAv2xeXTr4Ma",
       "subject_and_grade": "9th Grade Algebra",
       "learning_target": "Test target",
       "measure_of_success": "Test measure",
       "classroom_goal_statement": "Test goal",
       "org_id": "recsK5zK0CouK5ebW",
       "source": "web",
       "url": "https://recursivelearning.app/clients/st/goalsetter_live.html"
     }' \
     -v
   ```
   - Expected: 200 OK with response body
   - Next: Test error cases
   - Log: Response body and timing
   - Validation: Check CloudWatch logs for Lambda execution

### Phase 3: Error Testing (Future Phase)
1. Test Missing Fields
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://recursivelearning.app" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test"}' \
     -v
   ```
   - Expected: 400 Bad Request
   - Log: Error response

2. Test Invalid Origin
   ```bash
   curl -X POST $API_ENDPOINT/chat \
     -H "Origin: https://unauthorized-domain.com" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test"}' \
     -v
   ```
   - Expected: CORS error
   - Log: Error response

## Success Criteria
1. All infrastructure deployments succeed
2. OPTIONS request returns correct CORS headers
3. POST request returns 200 OK with valid response
4. All allowed origins work
5. Unauthorized origins are blocked
6. Error cases return appropriate responses

## Logging Strategy
1. API Gateway:
   - Enable detailed logging
   - Log request/response bodies
   - Log CORS headers

2. Lambda:
   - Log incoming request
   - Log CORS validation
   - Log response construction
   - Log any errors

3. CloudWatch:
   - Set up log groups
   - Configure retention
   - Set up alarms for errors

## Next Steps
1. Deploy updated template with fixed CORS configuration
2. Verify API Gateway creation
3. Test OPTIONS request
4. Document results
5. Address any failures

## Why This Time Is Different
1. Fixed Response Parameters Format:
   - Previous: Used string format
   - Now: Using proper JSON object format with "value" key

2. Removed ResponseTemplates:
   - Previous: Included ResponseTemplates in MOCK integration
   - Now: Removed as not allowed in MOCK integrations

3. Enhanced Logging:
   - Previous: Basic console.log
   - Now: Structured logging with request/response details

4. Clear Testing Phases:
   - Previous: Mixed testing approach
   - Now: Structured phases with clear success criteria

5. Documented Learnings:
   - Previous: No documentation of failure points
   - Now: Comprehensive documentation of all learnings 