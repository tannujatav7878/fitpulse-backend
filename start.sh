#!/bin/bash
echo ""
echo "  Starting FitPulse Website..."
echo ""
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
    echo "  First run detected - installing dependencies..."
    echo "  This will take about 30 seconds..."
    echo ""
    npm install
    echo ""
fi
echo "  Opening browser at http://localhost:3000"
echo ""
(sleep 2 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null)) &
node server.js
