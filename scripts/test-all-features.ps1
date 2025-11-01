#!/usr/bin/env pwsh
# Review Assistant - Script Automat de Testare (PowerShell)
# Testează toate funcționalitățile implementate

# Config
$API_URL = "http://localhost:5000"
$TEST_EMAIL = "test-$(Get-Date -Format 'yyyyMMddHHmmss')@review-assistant.com"
$TEST_PASSWORD = "TestPassword123!"
$TOKEN = ""

# Counters
$TESTS_PASSED = 0
$TESTS_FAILED = 0

# Helper functions
function Print-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
}

function Print-Test {
    param([string]$Message)
    Write-Host "▶ Test: $Message" -ForegroundColor Yellow
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:TESTS_PASSED++
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:TESTS_FAILED++
}

function Check-Service {
    param(
        [string]$ServiceName,
        [string]$Url
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
        Print-Success "$ServiceName is running"
        return $true
    } catch {
        Print-Error "$ServiceName is NOT running at $Url"
        return $false
    }
}

# Main tests
function Run-Tests {
    Print-Header "🧪 Review Assistant - Test Suite Automat"
    
    Write-Host "Test Email: $TEST_EMAIL"
    Write-Host "API URL: $API_URL"
    Write-Host ""
    
    # Test 0: Prerequisites
    Print-Header "Test 0: Prerequisites"
    
    Print-Test "Checking if Backend is running"
    if (-not (Check-Service "Backend" "$API_URL/api/health")) {
        Write-Host ""
        Write-Host "❌ Backend is not running!" -ForegroundColor Red
        Write-Host "Please start the backend first: cd Backend && dotnet run"
        exit 1
    }
    
    Print-Test "Checking if Ollama is running"
    if (-not (Check-Service "Ollama" "http://localhost:11434/api/tags")) {
        Write-Host "⚠️  Ollama not running - AI review tests will fail" -ForegroundColor Yellow
    }
    
    # Test 1: Authentication
    Print-Header "Test 1: Authentication"
    
    Print-Test "Register new user"
    try {
        $registerBody = @{
            email = $TEST_EMAIL
            password = $TEST_PASSWORD
            firstName = "Test"
            lastName = "User"
        } | ConvertTo-Json
        
        $registerResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/register" `
            -Method POST `
            -ContentType "application/json" `
            -Body $registerBody
        
        if ($registerResponse.success) {
            Print-Success "User registered successfully"
        } else {
            Print-Error "User registration failed"
        }
    } catch {
        Print-Error "User registration failed: $($_.Exception.Message)"
    }
    
    Print-Test "Login and get JWT token"
    try {
        $loginBody = @{
            email = $TEST_EMAIL
            password = $TEST_PASSWORD
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginBody
        
        $script:TOKEN = $loginResponse.token
        
        if ($TOKEN) {
            Print-Success "Login successful, token obtained"
            Write-Host "  Token: $($TOKEN.Substring(0, [Math]::Min(30, $TOKEN.Length)))..."
        } else {
            Print-Error "Login failed: No token received"
            exit 1
        }
    } catch {
        Print-Error "Login failed: $($_.Exception.Message)"
        exit 1
    }
    
    # Test 2: AI Review
    Print-Header "Test 2: AI Review (Basic)"
    
    Print-Test "Check Ollama status"
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_URL/api/aireview/status"
        if ($statusResponse.status -eq "healthy") {
            Print-Success "Ollama is healthy and ready"
        } else {
            Print-Error "Ollama status check failed"
        }
    } catch {
        Print-Error "Ollama status check failed: $($_.Exception.Message)"
    }
    
    Print-Test "Submit code for review"
    try {
        $code = "function test() { var x = 5; console.log(x); }"
        $reviewBody = @{
            code = $code
            fileName = "test.js"
            language = "JavaScript"
        } | ConvertTo-Json
        
        $reviewResponse = Invoke-RestMethod -Uri "$API_URL/api/aireview" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "application/json" `
            -Body $reviewBody
        
        if ($reviewResponse.success) {
            Print-Success "Code review completed"
            Write-Host "  Findings detected: $($reviewResponse.findings.Count)"
        } else {
            Print-Error "Code review failed"
        }
    } catch {
        Print-Error "Code review failed: $($_.Exception.Message)"
    }
    
    # Test 3: Git Integration
    Print-Header "Test 3: Git Integration"
    
    $repoPath = (Get-Location).Path
    
    Print-Test "Validate Git repository"
    try {
        $validateBody = @{
            repositoryPath = $repoPath
        } | ConvertTo-Json
        
        $validateResponse = Invoke-RestMethod -Uri "$API_URL/api/git/validate" `
            -Method POST `
            -ContentType "application/json" `
            -Body $validateBody
        
        if ($validateResponse.isValid) {
            Print-Success "Repository is valid"
        } else {
            Print-Error "Repository validation failed"
        }
    } catch {
        Print-Error "Repository validation failed: $($_.Exception.Message)"
    }
    
    Print-Test "Get repository info"
    try {
        $infoBody = @{
            repositoryPath = $repoPath
        } | ConvertTo-Json
        
        $infoResponse = Invoke-RestMethod -Uri "$API_URL/api/git/info" `
            -Method POST `
            -ContentType "application/json" `
            -Body $infoBody
        
        if ($infoResponse.repository.currentBranch) {
            $branch = $infoResponse.repository.currentBranch
            Print-Success "Repository info retrieved (branch: $branch)"
        } else {
            Print-Error "Failed to get repository info"
        }
    } catch {
        Print-Error "Failed to get repository info: $($_.Exception.Message)"
    }
    
    # Test 4: Comments
    Print-Header "Test 4: Threaded Comments"
    
    Print-Test "Create a comment"
    try {
        $commentBody = @{
            reviewId = 1
            filePath = "test.js"
            lineNumber = 1
            message = "This is a test comment"
            commentType = "suggestion"
            severity = "low"
        } | ConvertTo-Json
        
        $commentResponse = Invoke-RestMethod -Uri "$API_URL/api/comment" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "application/json" `
            -Body $commentBody
        
        if ($commentResponse.success) {
            $commentId = $commentResponse.comment.id
            Print-Success "Comment created (ID: $commentId)"
            
            Print-Test "Add reply to comment"
            $replyBody = @{
                message = "Thanks for the suggestion!"
            } | ConvertTo-Json
            
            $replyResponse = Invoke-RestMethod -Uri "$API_URL/api/comment/$commentId/reply" `
                -Method POST `
                -Headers @{ Authorization = "Bearer $TOKEN" } `
                -ContentType "application/json" `
                -Body $replyBody
            
            if ($replyResponse.success) {
                Print-Success "Reply added to comment"
            } else {
                Print-Error "Failed to add reply"
            }
            
            Print-Test "Resolve comment"
            $resolveResponse = Invoke-RestMethod -Uri "$API_URL/api/comment/$commentId/resolve" `
                -Method PUT `
                -Headers @{ Authorization = "Bearer $TOKEN" }
            
            if ($resolveResponse.success) {
                Print-Success "Comment marked as resolved"
            } else {
                Print-Error "Failed to resolve comment"
            }
        } else {
            Print-Error "Comment creation failed"
        }
    } catch {
        Print-Error "Comment operations failed: $($_.Exception.Message)"
    }
    
    # Test 5: Effort Estimation
    Print-Header "Test 5: Effort Estimation"
    
    Print-Test "Calculate effort for findings"
    try {
        $effortBody = @{
            findings = @(
                @{
                    file = "test.cs"
                    lineStart = 10
                    lineEnd = 10
                    severity = "critical"
                    category = "security"
                    message = "SQL injection"
                    suggestion = "Use parameterized queries"
                },
                @{
                    file = "test.cs"
                    lineStart = 20
                    lineEnd = 20
                    severity = "high"
                    category = "bug"
                    message = "Null reference"
                    suggestion = "Add null check"
                }
            )
        } | ConvertTo-Json -Depth 10
        
        $effortResponse = Invoke-RestMethod -Uri "$API_URL/api/aireview/estimate-effort" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "application/json" `
            -Body $effortBody
        
        if ($effortResponse.estimate.totalHours) {
            $hours = $effortResponse.estimate.totalHours
            $complexity = $effortResponse.estimate.complexity
            Print-Success "Effort estimated: $hours hours (complexity: $complexity)"
        } else {
            Print-Error "Effort estimation failed"
        }
    } catch {
        Print-Error "Effort estimation failed: $($_.Exception.Message)"
    }
    
    # Test 6: Projects
    Print-Header "Test 6: Projects Management"
    
    Print-Test "Create a project"
    try {
        $projectBody = @{
            name = "Test Project"
            description = "Automated test project"
            isPublic = $true
            tags = "test,automation"
            files = @(
                @{
                    fileName = "test.js"
                    filePath = "src/test.js"
                    content = "console.log('test');"
                    language = "JavaScript"
                }
            )
        } | ConvertTo-Json -Depth 10
        
        $projectResponse = Invoke-RestMethod -Uri "$API_URL/api/project/create" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "application/json" `
            -Body $projectBody
        
        if ($projectResponse.success) {
            $projectId = $projectResponse.projectId
            Print-Success "Project created (ID: $projectId)"
            
            Print-Test "Get my projects"
            $myProjects = Invoke-RestMethod -Uri "$API_URL/api/project/my-projects" `
                -Headers @{ Authorization = "Bearer $TOKEN" }
            
            if ($myProjects.projects.name -contains "Test Project") {
                Print-Success "Project retrieved from my projects list"
            } else {
                Print-Error "Failed to retrieve project"
            }
        } else {
            Print-Error "Project creation failed"
        }
    } catch {
        Print-Error "Project operations failed: $($_.Exception.Message)"
    }
    
    # Final Summary
    Print-Header "📊 Test Summary"
    
    $totalTests = $TESTS_PASSED + $TESTS_FAILED
    
    Write-Host "Total Tests: $totalTests"
    Write-Host "Passed: $TESTS_PASSED" -ForegroundColor Green
    Write-Host "Failed: $TESTS_FAILED" -ForegroundColor Red
    
    if ($TESTS_FAILED -eq 0) {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "🎉 All tests passed! Review Assistant is working perfectly!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        exit 0
    } else {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
        Write-Host "❌ Some tests failed. Please check the output above." -ForegroundColor Red
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

# Run tests
Run-Tests

