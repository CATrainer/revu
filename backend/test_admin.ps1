# PowerShell script to test admin endpoints
$baseUrl = "http://localhost:8000/api/v1"

# Login to get token
Write-Host "🔐 Logging in to get access token..."

$loginBody = @{
    username = "caleb.a.trainer@gmail.com"
    password = "password123"  # Common test password
}

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.access_token
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    
    # Set headers for authenticated requests
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Test admin endpoints
    Write-Host "`n📋 Testing GET /admin/waiting-list..."
    try {
        $waitingResponse = Invoke-WebRequest -Uri "$baseUrl/admin/waiting-list" -Method GET -Headers $headers
        $waitingUsers = $waitingResponse.Content | ConvertFrom-Json
        Write-Host "✅ Found $($waitingUsers.Count) users on waiting list" -ForegroundColor Green
        
        if ($waitingUsers.Count -gt 0) {
            Write-Host "   First few users:"
            $waitingUsers | Select-Object -First 3 | ForEach-Object {
                Write-Host "   📧 $($_.email) - Status: $($_.access_status)" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "❌ Waiting list request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n👥 Testing GET /admin/users..."
    try {
        $usersResponse = Invoke-WebRequest -Uri "$baseUrl/admin/users" -Method GET -Headers $headers
        $allUsers = $usersResponse.Content | ConvertFrom-Json
        Write-Host "✅ Found $($allUsers.Count) total users" -ForegroundColor Green
        
        # Show stats
        $stats = @{}
        $allUsers | ForEach-Object {
            $status = $_.access_status
            if ($stats.ContainsKey($status)) {
                $stats[$status]++
            } else {
                $stats[$status] = 1
            }
        }
        
        Write-Host "   📊 User Status Breakdown:"
        $stats.GetEnumerator() | ForEach-Object {
            Write-Host "      $($_.Key): $($_.Value) users" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Users request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n🎯 Would you like to grant early access to caleb.a.trainer@gmail.com?"
    Write-Host "   Uncomment the code below to test granting access"
    
    # Uncomment to grant early access:
    <#
    Write-Host "`n🚀 Testing POST /admin/grant-access..."
    $grantBody = @{
        email = "caleb.a.trainer@gmail.com"
        access_level = "early_access"
    } | ConvertTo-Json
    
    try {
        $grantResponse = Invoke-WebRequest -Uri "$baseUrl/admin/grant-access" -Method POST -Headers $headers -Body $grantBody
        $grantResult = $grantResponse.Content | ConvertFrom-Json
        Write-Host "✅ Successfully granted access!" -ForegroundColor Green
        Write-Host "   $($grantResult.message)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Grant access failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    #>
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please check your email and password" -ForegroundColor Yellow
}

Write-Host "`n🎉 Admin endpoint testing complete!"
