#!/usr/bin/env bash
set -e

echo "============================================================"
echo "NaSCon '26 Part I: Test Runner"
echo "============================================================"

# Resolve project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure PATH includes standard locations on Linux/macOS or Git Bash/WSL on Windows
if ! command -v node &>/dev/null; then
    for p in "/c/Program Files/nodejs" "/mnt/c/Program Files/nodejs" "/usr/local/bin" "/usr/bin"; do
        if [ -x "$p/node" ] || [ -x "$p/node.exe" ]; then
            export PATH="$p:$PATH"
            break
        fi
    done
fi

if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    for p in "/c/Users/saifu/AppData/Local/Programs/Python/Python312" "/mnt/c/Users/saifu/AppData/Local/Programs/Python/Python312" "/usr/local/bin" "/usr/bin"; do
        if [ -x "$p/python" ] || [ -x "$p/python.exe" ] || [ -x "$p/python3" ]; then
            export PATH="$p:$PATH"
            break
        fi
    done
fi

# 1. Run Node.js Test Suite (Signature & Cryptography)
echo "--- Running Node.js Test Suite (Signature & Cryptography) ---"
if command -v node &>/dev/null; then
    node --test --test-concurrency=1 tests/**/*.test.js
elif command -v node.exe &>/dev/null; then
    node.exe --test --test-concurrency=1 tests/**/*.test.js
else
    echo "ERROR: node is required to run Node.js tests."
    exit 1
fi

# 2. Run Python Submission Package & Compliance Tests
echo "--- Running Python Submission Package & Vector Tests ---"
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
elif command -v python.exe &>/dev/null; then
    PYTHON_CMD=python.exe
else
    echo "ERROR: Python is required to run compliance tests."
    exit 1
fi

"$PYTHON_CMD" -m unittest discover -s tests -p "test_*.py" -v

echo "============================================================"
echo "All available tests completed successfully."
echo "============================================================"
