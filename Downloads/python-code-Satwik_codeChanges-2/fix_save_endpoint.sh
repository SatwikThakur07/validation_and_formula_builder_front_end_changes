#!/bin/bash
# Script to fix the save endpoint 404 issue

echo "=== Fixing Save Endpoint 404 Issue ==="
echo ""

# 1. Kill all Python/uvicorn processes
echo "1. Killing all Python server processes..."
pkill -f "uvicorn.*main:app" || true
pkill -f "python.*main.py" || true
sleep 2

# 2. Clear Python cache
echo "2. Clearing Python cache..."
find python -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find python -name "*.pyc" -delete 2>/dev/null || true
find python -name "*.pyo" -delete 2>/dev/null || true
echo "✅ Cache cleared"

# 3. Verify the endpoint exists in the file
echo "3. Verifying endpoint in file..."
if grep -q '@router.post("/api/v1/recologics/save")' python/app/routes/reconciliation.py; then
    echo "✅ Endpoint found in file"
else
    echo "❌ Endpoint NOT found in file!"
    exit 1
fi

# 4. Check file syntax
echo "4. Checking file syntax..."
python3 -m py_compile python/app/routes/reconciliation.py 2>&1
if [ $? -eq 0 ]; then
    echo "✅ File syntax is valid"
else
    echo "❌ File has syntax errors!"
    exit 1
fi

echo ""
echo "=== Next Steps ==="
echo "1. Start the server:"
echo "   cd python"
echo "   python -m uvicorn app.main:app --reload --port 8034"
echo ""
echo "2. Test the endpoint:"
echo "   curl -X POST http://localhost:8034/api/reconciliation/api/v1/recologics/save \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"tenders\":[\"ZOMATO\"],\"recoData\":[{\"id\":1}],\"effectiveFrom\":\"2024-01-01\"}'"
echo ""
echo "✅ Fix script completed"

