"""
Submission Package Structural & Compliance Verification Test
Verifies required root items and constraints per official rules.
"""

import json
import os
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class TestSubmissionPackage(unittest.TestCase):
    def test_required_root_files_exist(self):
        """Verifies all mandatory submission items from Section 1.3 exist."""
        required_items = [
            "docker-compose.yml",
            ".env.example",
            "README.md",
            "TRACEABILITY.md",
            "tests",
            "run_tests.sh",
            "COVERAGE.json",
            "mobile",
        ]
        for item in required_items:
            path = os.path.join(REPO_ROOT, item)
            self.assertTrue(os.path.exists(path), f"Required submission item missing: {item}")

    def test_env_example_contains_salt_variable(self):
        """Verifies DAY1_SALT is declared in .env.example without a hardcoded real secret."""
        env_example_path = os.path.join(REPO_ROOT, ".env.example")
        with open(env_example_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("DAY1_SALT", content, ".env.example must declare DAY1_SALT")

        # Ensure no real salt value is prefilled (must be empty or an explicit placeholder)
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("DAY1_SALT="):
                val = line.split("=", 1)[1].strip()
                self.assertTrue(
                    val == "" or "replace" in val.lower() or "your" in val.lower(),
                    ".env.example must not contain a real salt value"
                )

    def test_docker_compose_forwards_salt(self):
        """Verifies docker-compose.yml forwards ${DAY1_SALT} to the backend service."""
        compose_path = os.path.join(REPO_ROOT, "docker-compose.yml")
        with open(compose_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("${DAY1_SALT}", content, "docker-compose.yml must forward ${DAY1_SALT}")

    def test_coverage_json_format(self):
        """Verifies COVERAGE.json contains the exact six backend domain keys from Section 9.3."""
        coverage_path = os.path.join(REPO_ROOT, "COVERAGE.json")
        with open(coverage_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        required_keys = {"fixtures", "scoring", "standings", "store", "roster", "rbac"}
        self.assertEqual(set(data.keys()), required_keys, "COVERAGE.json keys must match Section 9.3 exactly")

        for key, val in data.items():
            self.assertIsInstance(val, (int, float), f"Coverage for {key} must be a number")
            self.assertGreaterEqual(val, 0.0)
            self.assertLessEqual(val, 100.0)


if __name__ == "__main__":
    unittest.main()
