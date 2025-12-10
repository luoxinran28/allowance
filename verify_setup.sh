#!/bin/bash

# Quick verification script for Allowance System setup
echo "í´ Verifying Allowance System Setup..."
echo ""

# Check database
echo "í³Š Database Status:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
  "SELECT 'Users: ' || COUNT(*) FROM users;" 2>/dev/null
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
  "SELECT 'Organizations: ' || COUNT(*) FROM organizations;" 2>/dev/null
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
  "SELECT 'Teams: ' || COUNT(*) FROM teams;" 2>/dev/null

echo ""
echo "í´ User Tier Distribution:"
docker exec allowance-postgres psql -U postgres -d allowance -t -c \
  "SELECT tier, COUNT(*) FROM users GROUP BY tier ORDER BY tier;" 2>/dev/null | \
  sed 's/^/  /'

echo ""
echo "í¿¥ API Health:"
curl -s http://localhost:4040/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1

echo ""
echo "ï¿½ï¿½ Frontend Status:"
if curl -s http://localhost:3030 2>/dev/null | grep -q "Allowance"; then
  echo "  âœ… Frontend is running"
else
  echo "  âŒ Frontend may have issues"
fi

echo ""
echo "âœ… Verification Complete!"
