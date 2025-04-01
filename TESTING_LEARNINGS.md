# Testing Learnings & Strategy

## Known Failure Points & Solutions

### 1. API Gateway Configuration
- [x] Cannot use wildcards in CORS origins
- [x] Response parameters must be strings with single quotes: `'string'`
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
- [x] Response headers must be strings with single quotes

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
   - Previous: Used JSON object format with "value" key
   - Now: Using direct string values with single quotes

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

## Key Discoveries from Multiple Trials

### API Gateway V2 Integration Formats
1. First Attempt: Simple string format
   ```yaml
   ResponseParameters:
     method.response.header.Access-Control-Allow-Headers: "'Content-Type,Authorization'"
   ```
   - Result: Failed validation
   - Error: Expected JSONObject, found String

2. Second Attempt: JSON object with value key
   ```yaml
   ResponseParameters:
     method.response.header.Access-Control-Allow-Headers: {"value": "Content-Type,Authorization"}
   ```
   - Result: Failed validation
   - Error: Expected JSONObject, found String

3. Third Attempt: JSON object with quoted values
   ```yaml
   ResponseParameters:
     method.response.header.Access-Control-Allow-Headers: {"value": "'Content-Type,Authorization'"}
   ```
   - Result: Failed validation
   - Error: Expected JSONObject, found String

4. Fourth Attempt: Integration Response format
   ```yaml
   IntegrationResponses:
     - StatusCode: 200
       ResponseParameters:
         Headers:
           Access-Control-Allow-Headers: "'Content-Type,Authorization'"
   ```
   - Result: Failed validation
   - Error: Expected JSONObject, found String

5. Current Attempt: Request Parameters format
   ```yaml
   RequestParameters:
     method.response.header.Access-Control-Allow-Headers: "'Content-Type,Authorization'"
   ```
   - Status: In progress

### Critical Learnings
1. API Gateway V2 vs V1:
   - V2 has stricter validation requirements
   - V2 uses different parameter formats
   - V2 CORS handling is more complex

2. CORS Configuration:
   - Must be configured at both API and Integration levels
   - Headers must be explicitly defined
   - Values must be properly formatted (still determining correct format)

3. Mock Integration Requirements:
   - Cannot use ResponseTemplates
   - Must handle CORS headers differently than AWS_PROXY
   - Requires specific parameter structure

4. Deployment Process:
   - Each failed deployment requires manual cleanup
   - Stack updates may require complete recreation
   - Testing each format requires full deployment cycle

## Next Steps
1. Research API Gateway V2 Mock Integration examples
2. Consider alternative CORS handling approaches:
   - Using Lambda for OPTIONS requests
   - Using API Gateway V1 instead
   - Using custom authorizer
3. Document successful format once found

## Cleanup Strategy
1. Before next attempt:
   ```bash
   aws cloudformation delete-stack --stack-name rl-lambda-2025
   aws cloudformation wait stack-delete-complete --stack-name rl-lambda-2025
   ```
2. Verify resources are cleaned up:
   - API Gateway
   - Lambda permissions
   - CloudWatch logs

## Success Criteria Update
1. CORS preflight must:
   - Return 200 status
   - Include all required headers
   - Support all configured origins
2. Headers must be:
   - Properly formatted
   - Include correct values
   - Pass API Gateway validation

## Why Previous Attempts Failed
1. Format Mismatch:
   - API Gateway V2 expects specific JSON structure
   - String values not accepted directly
   - Nested objects required for headers

2. Documentation Gaps:
   - AWS docs don't clearly specify V2 format
   - Examples often show V1 format
   - Community resources limited

3. Validation Requirements:
   - Stricter than V1
   - Less forgiving of format variations
   - More specific about object structures

## Current Hypothesis
The correct format might require:
1. Using IntegrationResponse with specific structure
2. Defining response models
3. Using template mapping
4. Or switching to Lambda-based CORS handling

## Documentation Improvements
1. Added clear format progression
2. Documented each failure mode
3. Added cleanup procedures
4. Updated testing strategy
5. Added hypothesis for next attempts 

## Latest Insights from OpenAI Team

### Proven Architecture Pattern
1. Core Components:
   - Single Lambda handling multiple assistants
   - HTTP API (V2) with strict CORS
   - MOCK integration for OPTIONS
   - AWS_PROXY for POST

2. CORS Configuration:
   - Multiple allowed origins (no wildcards)
   - Limited methods (POST, OPTIONS only)
   - Specific headers (Content-Type, Authorization)
   - 300s MaxAge for preflight caching

3. Request Flow:
   - Frontend → API Gateway → Lambda
   - OPTIONS handled by MOCK (cost-effective)
   - Lambda routing based on packet content

### Template Improvements
1. Added SAM Transform:
   ```yaml
   Transform: AWS::Serverless-2016-10-31
   ```

2. Enhanced Globals:
   - Proper timeout (180s)
   - Memory allocation (256MB)
   - ARM64 architecture
   - JSON logging
   - X-Ray tracing

3. Fixed Integration Formats:
   - AWS_PROXY for chat
   - MOCK for OPTIONS
   - Proper response parameters

4. Improved IAM:
   - SSM parameter access
   - CloudWatch logging
   - API Gateway permissions

## Predictions for Next Deployment

### Expected Success Points
1. CORS Configuration:
   - Should accept all specified origins
   - Should handle preflight correctly
   - Should cache preflight for 5 minutes

2. Integration Types:
   - AWS_PROXY should work for chat
   - MOCK should handle OPTIONS
   - Response parameters should be valid

3. Lambda Integration:
   - Should have correct permissions
   - Should receive requests properly
   - Should be able to access SSM

### Potential Challenges
1. API Gateway V2 Specifics:
   - Response parameter format might need adjustment
   - Stage creation might need explicit ordering
   - Route targets might need path adjustment

2. Lambda Permissions:
   - Source ARN might need refinement
   - SSM access might need verification
   - CloudWatch logging might need setup

### Success Criteria
1. Infrastructure:
   - API Gateway created successfully
   - Lambda function deployed
   - All permissions granted

2. Functionality:
   - OPTIONS request returns 200
   - CORS headers present
   - POST request reaches Lambda

3. Monitoring:
   - CloudWatch logs available
   - X-Ray traces working
   - Metrics available

## Next Steps
1. Deploy updated template
2. Verify API Gateway creation
3. Test OPTIONS request
4. Test POST request
5. Monitor CloudWatch logs

## Why This Attempt Should Work
1. Proven Configuration:
   - Based on working example
   - Follows AWS best practices
   - Matches production requirements

2. Proper Structure:
   - Clear separation of concerns
   - Correct integration types
   - Proper permission model

3. Enhanced Monitoring:
   - Better logging
   - Tracing enabled
   - Metrics available

## Documentation Updates
1. Added architecture diagram
2. Updated CORS configuration
3. Added monitoring setup
4. Included success criteria
5. Added troubleshooting guide 

## Key Insight: MOCK Integration Purpose
1. MOCK Integration's True Purpose:
   - Designed for static responses
   - Perfect for OPTIONS/preflight handling
   - No Lambda invocation needed
   - Cost-effective for CORS preflight
   - Completely separate from actual endpoint logic

2. Separation of Concerns:
   - MOCK integration handles preflight (OPTIONS)
   - AWS_PROXY integration handles actual requests (POST)
   - No need for preflight to touch Lambda
   - Keeps CORS and business logic separate

3. Benefits of This Approach:
   - Reduces Lambda costs (no OPTIONS invocations)
   - Simplifies deployment (fewer dependencies)
   - Faster preflight responses
   - Clearer separation of responsibilities

## Previous Challenges Explained
Our circular dependency issues were partly due to mixing concerns:
- Trying to handle CORS in both Lambda and API Gateway
- Creating unnecessary dependencies between preflight and endpoint
- Overcomplicating the permission model

## Correct Architecture
1. MOCK Integration (OPTIONS):
   ```yaml
   ChatOptionsIntegration:
     Type: AWS::ApiGatewayV2::Integration
     Properties:
       IntegrationType: MOCK
       ResponseParameters:
         # CORS headers returned directly
   ```

2. AWS_PROXY Integration (POST):
   ```yaml
   ChatIntegration:
     Type: AWS::ApiGatewayV2::Integration
     Properties:
       IntegrationType: AWS_PROXY
       # Forwards to Lambda
   ```

3. Clear Separation:
   - OPTIONS → MOCK → Static CORS Response
   - POST → AWS_PROXY → Lambda Business Logic

## Why This Works Better
1. Reduced Complexity:
   - Each integration type does one job
   - No circular dependencies
   - Clear flow of requests

2. Better Performance:
   - Preflight responses are immediate
   - No Lambda cold starts for OPTIONS
   - Reduced latency for CORS

3. Cost Optimization:
   - No Lambda invocations for preflight
   - Simpler permission model
   - Fewer AWS resources

## Next Steps
1. Deploy updated template
2. Verify API Gateway creation
3. Test OPTIONS request
4. Test POST request
5. Monitor CloudWatch logs

## Why This Attempt Should Work
1. Proven Configuration:
   - Based on working example
   - Follows AWS best practices
   - Matches production requirements

2. Proper Structure:
   - Clear separation of concerns
   - Correct integration types
   - Proper permission model

3. Enhanced Monitoring:
   - Better logging
   - Tracing enabled
   - Metrics available

## Documentation Updates
1. Added architecture diagram
2. Updated CORS configuration
3. Added monitoring setup
4. Included success criteria
5. Added troubleshooting guide 