#!/bin/bash

# Review Assistant - Script Automat de Testare
# Testează toate funcționalitățile implementate

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
API_URL="http://localhost:5000"
TEST_EMAIL="test-$(date +%s)@review-assistant.com"
TEST_PASSWORD="TestPassword123!"
TOKEN=""

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
    echo -e "${YELLOW}▶ Test: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

check_service() {
    local service=$1
    local url=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        print_success "$service is running"
        return 0
    else
        print_error "$service is NOT running at $url"
        return 1
    fi
}

# Main tests
main() {
    print_header "🧪 Review Assistant - Test Suite Automat"
    
    echo "Test Email: $TEST_EMAIL"
    echo "API URL: $API_URL"
    echo ""
    
    # Test 0: Prerequisites
    print_header "Test 0: Prerequisites"
    
    print_test "Checking if Backend is running"
    if check_service "Backend" "$API_URL/api/health"; then
        :
    else
        echo -e "\n${RED}❌ Backend is not running!${NC}"
        echo "Please start the backend first: cd Backend && dotnet run"
        exit 1
    fi
    
    print_test "Checking if Ollama is running"
    check_service "Ollama" "http://localhost:11434/api/tags" || echo "⚠️  Ollama not running - AI review tests will fail"
    
    # Test 1: Authentication
    print_header "Test 1: Authentication"
    
    print_test "Register new user"
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")
    
    if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
        print_success "User registered successfully"
    else
        print_error "User registration failed: $REGISTER_RESPONSE"
    fi
    
    print_test "Login and get JWT token"
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        print_success "Login successful, token obtained"
        echo "  Token: ${TOKEN:0:30}..."
    else
        print_error "Login failed: $LOGIN_RESPONSE"
        exit 1
    fi
    
    # Test 2: AI Review
    print_header "Test 2: AI Review (Basic)"
    
    print_test "Check Ollama status"
    STATUS_RESPONSE=$(curl -s "$API_URL/api/aireview/status")
    if echo "$STATUS_RESPONSE" | grep -q "healthy"; then
        print_success "Ollama is healthy and ready"
    else
        print_error "Ollama status check failed"
    fi
    
    print_test "Submit code for review"
    CODE='function test() { var x = 5; console.log(x); }'
    
    REVIEW_RESPONSE=$(curl -s -X POST "$API_URL/api/aireview" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"code\": \"$CODE\",
            \"fileName\": \"test.js\",
            \"language\": \"JavaScript\"
        }")
    
    if echo "$REVIEW_RESPONSE" | grep -q "success.*true"; then
        print_success "Code review completed"
        FINDINGS_COUNT=$(echo "$REVIEW_RESPONSE" | grep -o '"findings":\[' | wc -l)
        echo "  Findings detected"
    else
        print_error "Code review failed"
    fi
    
    # Test 3: Git Integration
    print_header "Test 3: Git Integration"
    
    REPO_PATH=$(pwd)
    
    print_test "Validate Git repository"
    VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/api/git/validate" \
        -H "Content-Type: application/json" \
        -d "{\"repositoryPath\": \"$REPO_PATH\"}")
    
    if echo "$VALIDATE_RESPONSE" | grep -q "isValid.*true"; then
        print_success "Repository is valid"
    else
        print_error "Repository validation failed"
    fi
    
    print_test "Get repository info"
    INFO_RESPONSE=$(curl -s -X POST "$API_URL/api/git/info" \
        -H "Content-Type: application/json" \
        -d "{\"repositoryPath\": \"$REPO_PATH\"}")
    
    if echo "$INFO_RESPONSE" | grep -q "currentBranch"; then
        BRANCH=$(echo "$INFO_RESPONSE" | grep -o '"currentBranch":"[^"]*"' | cut -d'"' -f4)
        print_success "Repository info retrieved (branch: $BRANCH)"
    else
        print_error "Failed to get repository info"
    fi
    
    # Test 4: Comments
    print_header "Test 4: Threaded Comments"
    
    print_test "Create a comment"
    COMMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/comment" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "reviewId": 1,
            "filePath": "test.js",
            "lineNumber": 1,
            "message": "This is a test comment",
            "commentType": "suggestion",
            "severity": "low"
        }')
    
    if echo "$COMMENT_RESPONSE" | grep -q "success.*true"; then
        COMMENT_ID=$(echo "$COMMENT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        print_success "Comment created (ID: $COMMENT_ID)"
        
        print_test "Add reply to comment"
        REPLY_RESPONSE=$(curl -s -X POST "$API_URL/api/comment/$COMMENT_ID/reply" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "message": "Thanks for the suggestion!"
            }')
        
        if echo "$REPLY_RESPONSE" | grep -q "success.*true"; then
            print_success "Reply added to comment"
        else
            print_error "Failed to add reply"
        fi
        
        print_test "Resolve comment"
        RESOLVE_RESPONSE=$(curl -s -X PUT "$API_URL/api/comment/$COMMENT_ID/resolve" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$RESOLVE_RESPONSE" | grep -q "success.*true"; then
            print_success "Comment marked as resolved"
        else
            print_error "Failed to resolve comment"
        fi
    else
        print_error "Comment creation failed"
    fi
    
    # Test 5: Effort Estimation
    print_header "Test 5: Effort Estimation"
    
    print_test "Calculate effort for findings"
    EFFORT_RESPONSE=$(curl -s -X POST "$API_URL/api/aireview/estimate-effort" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "findings": [
                {
                    "file": "test.cs",
                    "lineStart": 10,
                    "lineEnd": 10,
                    "severity": "critical",
                    "category": "security",
                    "message": "SQL injection",
                    "suggestion": "Use parameterized queries"
                },
                {
                    "file": "test.cs",
                    "lineStart": 20,
                    "lineEnd": 20,
                    "severity": "high",
                    "category": "bug",
                    "message": "Null reference",
                    "suggestion": "Add null check"
                }
            ]
        }')
    
    if echo "$EFFORT_RESPONSE" | grep -q "totalHours"; then
        HOURS=$(echo "$EFFORT_RESPONSE" | grep -o '"totalHours":[0-9.]*' | cut -d':' -f2)
        COMPLEXITY=$(echo "$EFFORT_RESPONSE" | grep -o '"complexity":"[^"]*"' | cut -d'"' -f4)
        print_success "Effort estimated: $HOURS hours (complexity: $COMPLEXITY)"
    else
        print_error "Effort estimation failed"
    fi
    
    # Test 6: Projects
    print_header "Test 6: Projects Management"
    
    print_test "Create a project"
    PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/project/create" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Project",
            "description": "Automated test project",
            "isPublic": true,
            "tags": "test,automation",
            "files": [
                {
                    "fileName": "test.js",
                    "filePath": "src/test.js",
                    "content": "console.log(\"test\");",
                    "language": "JavaScript"
                }
            ]
        }')
    
    if echo "$PROJECT_RESPONSE" | grep -q "success.*true"; then
        PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"projectId":[0-9]*' | cut -d':' -f2)
        print_success "Project created (ID: $PROJECT_ID)"
        
        print_test "Get my projects"
        MY_PROJECTS=$(curl -s "$API_URL/api/project/my-projects" \
            -H "Authorization: Bearer $TOKEN")
        
        if echo "$MY_PROJECTS" | grep -q "Test Project"; then
            print_success "Project retrieved from my projects list"
        else
            print_error "Failed to retrieve project"
        fi
    else
        print_error "Project creation failed"
    fi
    
    # Final Summary
    print_header "📊 Test Summary"
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}🎉 All tests passed! Review Assistant is working perfectly!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        exit 0
    else
        echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        exit 1
    fi
}

# Run tests
main "$@"

