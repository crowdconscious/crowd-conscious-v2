#!/bin/bash

# Production Testing Script Runner for Crowd Conscious
# Usage: ./scripts/run-tests.sh [environment]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-"local"}

echo -e "${BLUE}🚀 Crowd Conscious Production Testing Suite${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Check if required dependencies are installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx is required but not installed.${NC}"
    exit 1
fi

# Install tsx if not available
if ! npx tsx --version &> /dev/null; then
    echo -e "${YELLOW}📦 Installing tsx for TypeScript execution...${NC}"
    npm install -g tsx
fi

# Environment setup
case $ENVIRONMENT in
    "local")
        echo -e "${BLUE}🏠 Running tests against local environment${NC}"
        export NEXT_PUBLIC_APP_URL="http://localhost:3000"
        ;;
    "staging")
        echo -e "${YELLOW}🧪 Running tests against staging environment${NC}"
        export NEXT_PUBLIC_APP_URL="https://your-app-staging.vercel.app"
        ;;
    "production")
        echo -e "${RED}🔴 Running tests against PRODUCTION environment${NC}"
        export NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
        echo -e "${YELLOW}⚠️  Are you sure you want to run tests against production? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}✅ Test cancelled. Good choice!${NC}"
            exit 0
        fi
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
        echo "Usage: $0 [local|staging|production]"
        exit 1
        ;;
esac

# Check environment variables
echo -e "\n${BLUE}🔍 Checking environment configuration...${NC}"

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "RESEND_API_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    else
        echo -e "${GREEN}✅ $var is set${NC}"
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "\n${RED}❌ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "${RED}   - $var${NC}"
    done
    echo -e "\n${YELLOW}💡 Please set these variables in your .env.local file or environment${NC}"
    exit 1
fi

# Optional variables with warnings
optional_vars=(
    "TEST_EMAIL"
)

for var in "${optional_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${YELLOW}⚠️  $var not set (using default)${NC}"
    else
        echo -e "${GREEN}✅ $var is set${NC}"
    fi
done

# Run the tests
echo -e "\n${BLUE}🧪 Starting test execution...${NC}\n"

# Navigate to scripts directory
cd "$(dirname "$0")"

# Run the TypeScript test file
if npx tsx test-production.ts; then
    echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
    
    # Check if test report exists and show summary
    if [[ -f "../test-report.json" ]]; then
        echo -e "\n${BLUE}📊 Test Report Summary:${NC}"
        
        # Extract key metrics using basic tools (without jq dependency)
        total_tests=$(grep -o '"totalTests":[0-9]*' ../test-report.json | cut -d':' -f2)
        passed=$(grep -o '"passed":[0-9]*' ../test-report.json | cut -d':' -f2)
        failed=$(grep -o '"failed":[0-9]*' ../test-report.json | cut -d':' -f2)
        
        echo -e "Total Tests: $total_tests"
        echo -e "${GREEN}Passed: $passed${NC}"
        echo -e "${RED}Failed: $failed${NC}"
        
        if [[ $failed -eq 0 ]]; then
            echo -e "\n${GREEN}🚀 All systems ready for production deployment!${NC}"
        else
            echo -e "\n${YELLOW}⚠️  Some tests failed. Check test-report.json for details.${NC}"
        fi
        
        echo -e "\n${BLUE}📄 Full report: $(pwd)/../test-report.json${NC}"
    fi
    
else
    echo -e "\n${RED}❌ Test execution failed!${NC}"
    exit 1
fi

# Cleanup function
cleanup() {
    echo -e "\n${BLUE}🧹 Cleaning up...${NC}"
    # Add any cleanup tasks here if needed
}

# Set trap for cleanup on exit
trap cleanup EXIT

echo -e "\n${GREEN}✨ Testing complete!${NC}"
