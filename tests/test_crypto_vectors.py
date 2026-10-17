"""
Official Cryptographic Specification & Test Vector Validation
Based on Section 5.3 and Appendix A of NaSCon '26 Problem Specification.
"""

import hashlib
import hmac
import json
import unittest


def canonical_json(obj) -> str:
    """Canonical JSON format as defined in Section 5.3:
    Recursively sorted keys, no whitespace (separators=(',', ':')), UTF-8, ensure_ascii=False.
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_signature(salt: str, record_id: str, payload_obj) -> str:
    """HMAC-SHA256 signature recipe defined in Section 5.3 and Appendix A:
    signature = HMAC_SHA256(DAY1_SALT, id + '|' + canonical(payload))
    Key: UTF-8 encoded bytes of salt. Output: 64-char lowercase hex.
    """
    payload_str = canonical_json(payload_obj)
    msg = (record_id + "|" + payload_str).encode("utf-8")
    key = salt.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def compute_lots_key(seed: int, league_id: str, team_id: str) -> str:
    """Drawing of lots hash key defined in Section 5.10 and Appendix A:
    lots_key = SHA256(f'{seed}|{league_id}|{team_id}')
    """
    msg = f"{seed}|{league_id}|{team_id}".encode("utf-8")
    return hashlib.sha256(msg).hexdigest()


class TestOfficialVectors(unittest.TestCase):
    def test_vector_1_signature(self):
        """Validates Test Vector 1 from Appendix A:
        Salt: demo-salt
        id: evt-1
        payload: {'team_id': 't1', 'event_type': 'goal'}
        canonical payload: {"event_type":"goal","team_id":"t1"}
        expected signature: 972a8b558690b19121cc5bea84978f85e8eb15a3735018db36616bab1d7ec501
        """
        salt = "demo-salt"
        record_id = "evt-1"
        payload = {"team_id": "t1", "event_type": "goal"}

        canonical_str = canonical_json(payload)
        self.assertEqual(canonical_str, '{"event_type":"goal","team_id":"t1"}')

        sig = compute_signature(salt, record_id, payload)
        expected_sig = "972a8b558690b19121cc5bea84978f85e8eb15a3735018db36616bab1d7ec501"
        self.assertEqual(sig, expected_sig)

    def test_vector_2_drawing_of_lots(self):
        """Validates Test Vector 2 from Appendix A:
        Seed: 42, League: lg-1
        Teams: t1, t2, t3
        Ordered ascending by key, first = best
        """
        seed = 42
        league_id = "lg-1"

        k_t1 = compute_lots_key(seed, league_id, "t1")
        k_t2 = compute_lots_key(seed, league_id, "t2")
        k_t3 = compute_lots_key(seed, league_id, "t3")

        self.assertEqual(k_t1, "0613316991ce0ac31e88d6003e3ff4d5e21bb072ac5f81b42c0cdc6598453293")
        self.assertEqual(k_t2, "e3e3a14e22727f936e1f288cf5d02a8a9362b1da13c5432725fc10b2c7955dd9")
        self.assertEqual(k_t3, "c8f28e3c2f1eb6c4f636b4f57050e3362a2b39c07fda9b61742a26dd20397028")

        # Ascending sort: k_t1 < k_t3 < k_t2
        teams = ["t1", "t2", "t3"]
        teams_sorted = sorted(teams, key=lambda t: compute_lots_key(seed, league_id, t))
        self.assertEqual(teams_sorted, ["t1", "t3", "t2"])


if __name__ == "__main__":
    unittest.main()
