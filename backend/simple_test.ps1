# Simple PowerShell script to test admin endpoints
$baseUrl = "http://localhost:8000/api/v1"

Write-Host "Testing admin endpoints..."

# Login to get token
Write-Host "1. Logging in..."

$loginBody = "username=caleb.a.trainer@gmail.com&password=password123"

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.access_token
    
    Write-Host "✅ Login successful!"
    
    # Set headers for authenticated requests
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Test waiting list endpoint
    Write-Host "2. Getting waiting list..."
    try {
        $waitingResponse = Invoke-WebRequest -Uri "$baseUrl/admin/waiting-list" -Method GET -Headers $headers
        $waitingUsers = $waitingResponse.Content | ConvertFrom-Json
        Write-Host "✅ Found $($waitingUsers.Count) users on waiting list"
        
        foreach ($user in $waitingUsers) {
            Write-Host "   - $($user.email) ($($user.access_status))"
        }
    } catch {
        Write-Host "❌ Waiting list failed: $($_.Exception.Message)"
    }
    
    # Test all users endpoint
    Write-Host "3. Getting all users..."
    try {
        $usersResponse = Invoke-WebRequest -Uri "$baseUrl/admin/users" -Method GET -Headers $headers
        $allUsers = $usersResponse.Content | ConvertFrom-Json
        Write-Host "✅ Found $($allUsers.Count) total users"
        
        foreach ($user in $allUsers) {
            Write-Host "   - $($user.email): $($user.access_status)"
        }
    } catch {
        Write-Host "❌ All users failed: $($_.Exception.Message)"
    }
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
    Write-Host "Trying different password..."
    
    # Try with a different common password
    $loginBody2 = "username=caleb.a.trainer@gmail.com&password=123456"
    try {
        $loginResponse2 = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody2 -ContentType "application/x-www-form-urlencoded"
        Write-Host "✅ Login with alternate password successful!"
    } catch {
        Write-Host "❌ Both login attempts failed. Please check your password."
    }
}

Write-Host "Testing complete!"
