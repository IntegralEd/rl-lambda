# Testing Learnings & Strategy

## Known Failure Points & Solutions

### 1. API Gateway Configuration
- [x] Cannot use wildcards in CORS origins
- [x] Response parameters must be JSON objects, not strings
- [x] Integration types must be properly specified (AWS_PROXY vs MOCK)
- [x] Lambda permissions must be explicitly granted
- [x] Stage must be created before routes

### 2. Lambda Integration
- [x] Lambda ARN must be correct and function must exist
- [x] Lambda must have permission to be invoked by API Gateway
- [x] Lambda timeout must be sufficient (180s)
- [x] Lambda memory must be sufficient (256MB)

### 3. CORS Configuration
- [x] Must specify exact origins, no wildcards
- [x] Must include all required headers
- [x] Must handle OPTIONS preflight requests
- [x] Must set correct MaxAge value

## Testing Strategy

### Phase 1: Infrastructure Validation
1. Deploy API Gateway
   - Expected: Success
   - Next: Check API endpoint in AWS Console
   - Log: API ID and endpoint URL

2. Deploy Lambda Integration
   - Expected: Success
   - Next: Verify Lambda permissions
   - Log: Lambda ARN and permissions

3. Deploy CORS Configuration
   - Expected: Success
   - Next: Test OPTIONS request
   - Log: CORS headers in response

### Phase 2: Endpoint Testing
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

3. Test Error Cases
   - Missing required fields
   - Invalid origin
   - Invalid JSON
   - Expected: Appropriate error responses
   - Next: Test with different origins
   - Log: Error messages and status codes

### Phase 3: Origin Testing
1. Test Allowed Origins
   - https://recursivelearning.app
   - https://app.recursivelearning.app
   - https://admin.recursivelearning.app
   - https://api.recursivelearning.app
   - Expected: All succeed
   - Next: Test unauthorized origin
   - Log: Origin-specific responses

2. Test Unauthorized Origin
   - Expected: CORS error
   - Next: Final validation
   - Log: Error details

## Success Criteria
1. All infrastructure deployments succeed
2. OPTIONS request returns correct CORS headers
3. POST request returns 200 OK with valid response
4. All allowed origins work
5. Unauthorized origins are blocked
6. Error cases return appropriate responses

## Failure Recovery
If any test fails:
1. Check CloudWatch logs for Lambda errors
2. Verify API Gateway configuration
3. Check CORS settings
4. Validate Lambda permissions
5. Review request/response format

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
1. Deploy with enhanced logging
2. Run tests in sequence
3. Document results
4. Address any failures
5. Update documentation 