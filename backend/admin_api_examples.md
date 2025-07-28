# Admin API Endpoints Usage Examples

## Prerequisites
1. Start your backend server
2. Get an access token by logging in

## 1. Login to get access token
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password"
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "...",
  "token_type": "bearer"
}
```

## 2. List all users on waiting list
```bash
curl -X GET "http://localhost:8000/api/v1/admin/waiting-list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 3. List all users (with their access status)
```bash
curl -X GET "http://localhost:8000/api/v1/admin/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 4. Grant early access to a user
```bash
curl -X POST "http://localhost:8000/api/v1/admin/grant-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "user@example.com",
    "access_level": "early_access"
  }'
```

## 5. Grant full access to a user
```bash
curl -X POST "http://localhost:8000/api/v1/admin/grant-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "user@example.com",
    "access_level": "full_access"
  }'
```

## Example Response for Grant Access:
```json
{
  "message": "Successfully granted early_access to user@example.com",
  "user": {
    "email": "user@example.com",
    "old_status": "waiting_list",
    "new_status": "early_access",
    "granted_at": "2025-07-28T15:30:45.123456+00:00"
  }
}
```

## Frontend Usage (JavaScript)
```javascript
// In your frontend app, you can call these endpoints:

// Get waiting list
const response = await api.get('/admin/waiting-list');
const waitingUsers = response.data;

// Grant early access
const grantResponse = await api.post('/admin/grant-access', {
  email: 'user@example.com',
  access_level: 'early_access'
});

console.log('Access granted:', grantResponse.data);
```

## Error Responses:
- **404**: User not found
- **400**: Invalid access level
- **401**: Not authenticated
- **403**: Not authorized (admin only)
