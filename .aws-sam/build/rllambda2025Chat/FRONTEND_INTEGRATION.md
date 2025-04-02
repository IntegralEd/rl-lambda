# Recursive Learning Lambda API Integration Guide

## API Endpoint
```
https://e7mu4gwsvh.execute-api.us-east-2.amazonaws.com/chat
```

## CORS Configuration
The API is configured to accept requests from the following origin:
- https://recursivelearning.app

## Request Formats

### 1. Goal Setter Format
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

### 2. Standard Chat Format
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

## Example Requests

### Goal Setter Example
```javascript
const response = await fetch('https://e7mu4gwsvh.execute-api.us-east-2.amazonaws.com/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://recursivelearning.app'
  },
  body: JSON.stringify({
    intake_token: "goalsetter_chat",
    name: "Test Teacher",
    email: "teacher@school.edu",
    user_id: "user123",
    thread_id: "thread123",
    assistant_id: "asst_IA5PsJxdShVPTAv2xeXTr4Ma",
    subject_and_grade: "9th Grade Algebra",
    learning_target: "Students will solve quadratic equations",
    measure_of_success: "80% of students will score 80% or higher on the unit test",
    classroom_goal_statement: "I want to improve student engagement in algebra",
    org_id: "recsK5zK0CouK5ebW",
    source: "web",
    url: "https://recursivelearning.app/clients/st/goalsetter_live.html"
  })
});
```

### Standard Chat Example
```javascript
const response = await fetch('https://e7mu4gwsvh.execute-api.us-east-2.amazonaws.com/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://recursivelearning.app'
  },
  body: JSON.stringify({
    User_ID: "user123",
    Org_ID: "bbh_org",
    Assistant_ID: "asst_bbh_sleep",
    Thread_ID: "thread123",
    message: "I have questions about my baby's sleep",
    url: "https://recursivelearning.app/clients/bbh/sleep_live.html"
  })
});
```

## Response Format
```json
{
  "message": "string",  // The assistant's response
  "thread_id": "string" // The thread ID for continued conversation
}
```

## Error Responses
- 400 Bad Request: Missing required fields
- 500 Internal Server Error: Server-side error

## Testing Checklist
- [ ] Test CORS preflight (OPTIONS request)
- [ ] Test Goal Setter format with all required fields
- [ ] Test Standard Chat format with all required fields
- [ ] Test with different allowed origins
- [ ] Test error cases (missing fields, invalid data)
- [ ] Test URL context detection (live, temp, review modes)

## URL Context Modes
The API automatically detects the context from the URL:
- `*_live.html`: Production end-user interface
- `*_temp.html`: Development/testing interface
- `*_review.html`: Review/feedback interface
- `*.html`: Production interface

## Security Notes
- All requests must include the correct Origin header
- Content-Type must be application/json
- No API key required
- CORS is strictly enforced for allowed origins only

## Support
For any integration issues or questions, please contact the backend team. 