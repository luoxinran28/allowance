#!/bin/bash

# Test script for password reset endpoints

echo "Testing password reset endpoints..."

# Test 1: Request password reset
echo "1. Testing password reset request..."
curl -X POST http://localhost:3000/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com"}' \
  -w " -> Status: %{http_code}\n" \
  -s

# Test 2: Reset password with token
echo "2. Testing password reset..."
TOKEN="ep2EM73WMyyyq9WNAbI8LxdCjvfBDjTq2ikCrR5Uvk7jKrWzvzp5WwUHUIlcQBNL"
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"new_password\":\"NewTestPass123\"}" \
  -w " -> Status: %{http_code}\n" \
  -s

# Test 3: Test activation endpoint
echo "3. Testing account activation..."
ACTIVATION_TOKEN="9OXq6u43HgCHlETYqdeRNvJ5V2qQQMSdgtEKRFuwenBXkYE0Uy7nIaN2no5QygMb"
curl -X POST http://localhost:3000/auth/activate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$ACTIVATION_TOKEN\"}" \
  -w " -> Status: %{http_code}\n" \
  -s

echo "Tests completed!"