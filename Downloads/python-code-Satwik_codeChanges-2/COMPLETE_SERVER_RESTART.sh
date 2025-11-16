#!/bin/bash
# Complete server restart script to fix save endpoint 404

echo "=== Complete Server Restart for Save Endpoint Fix ==="
echo ""

# 1. Kill ALL Python processes related to the server
echo "1. Killing all Python server processes..."
pkill -9 -f "uvicorn.*main:app" || true
pkill -9 -f "python.*main.py" || true
pkill -9 -f "python.*8034" || true
sleep 3

# 2. Clear ALL Python cache
echo "2. Clearing ALL Python cache..."
find python -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find python -name "*.pyc" -delete 2>/dev/null || true
find python -name "*.pyo" -delete 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
echo "✅ Cache cleared"

# 3. Verify endpoint exists
echo "3. Verifying endpoint in file..."
if grep -q '@router.post("/api/v1/recologics/save")' python/app/routes/reconciliation.py; then
    echo "✅ Endpoint found in file at line:"
    grep -n '@router.post("/api/v1/recologics/save")' python/app/routes/reconciliation.py
else
    echo "❌ Endpoint NOT found in file!"
    exit 1
fi

# 4. Check syntax
echo "4. Checking file syntax..."
python3 -m py_compile python/app/routes/reconciliation.py 2>&1
if [ $? -eq 0 ]; then
    echo "✅ File syntax is valid"
else
    echo "❌ File has syntax errors!"
    exit 1
fi

# 5. Check router inclusion
echo "5. Checking router inclusion in main.py..."
if grep -q 'app.include_router(reconciliation.router, prefix="/api/reconciliation"' python/app/main.py; then
    echo "✅ Router correctly included in main.py"
else
    echo "❌ Router not correctly included!"
    exit 1
fi

echo ""
echo "=== All checks passed! ==="
echo ""
echo "Now start the server with:"
echo "  cd python"
echo "  python -m uvicorn app.main:app --reload --port 8034"
echo ""
echo "Then test the endpoint:"
echo "  curl -X POST http://localhost:8034/api/reconciliation/api/v1/recologics/save \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -d '{\"tenders\":[\"ZOMATO\"],\"recoData\":[{\"id\":1}],\"effectiveFrom\":\"2024-01-01\"}'"
echo ""
echo "✅ Restart script completed"

