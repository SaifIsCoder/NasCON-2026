#!/usr/bin/env bash
set -e

echo "============================================================"
echo "NaSCon '26 Part I: Test Runner"
echo "============================================================"

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Run all available unit tests
echo "Executing test suite in ./tests..."
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
else
    echo "ERROR: Python is required to run automated tests."
    exit 1
fi

"$PYTHON_CMD" -m unittest discover -s tests -p "test_*.py" -v

echo "============================================================"
echo "All available tests completed successfully."
echo "============================================================"
