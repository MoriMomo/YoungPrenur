"""Predecessor tokens from schedule exports: relation, lag and the codes that only look like relations."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from schedule_parser.base import _parse_pred_links, _parse_pred_token  # noqa: E402


class TestPredLinks(unittest.TestCase):
    def test_relations_and_lags(self):
        self.assertEqual(_parse_pred_token("9SS+3d"), ("9", "SS", 3.0))
        self.assertEqual(_parse_pred_token("WBS-1.2 FS-1w"), ("WBS-1.2", "FS", -5.0))
        self.assertEqual(_parse_pred_token("WBS-1.2FS+4h"), ("WBS-1.2", "FS", 0.5))
        self.assertEqual(_parse_pred_token("A FF + 1.5 d"), ("A", "FF", 1.5))
        self.assertEqual(_parse_pred_token("t2ss+1"), ("t2", "SS", 1.0))

    def test_single_digit_codes_from_ms_project_and_p6(self):
        self.assertEqual([l["code"] for l in _parse_pred_links("3FS;7FS")], ["3", "7"])
        self.assertEqual(_parse_pred_token("1FS"), ("1", "FS", 0.0))

    def test_lag_without_relation_implies_fs(self):
        self.assertEqual(_parse_pred_token("WBS-1.2+2d"), ("WBS-1.2", "FS", 2.0))

    def test_codes_ending_in_relation_letters_stay_whole(self):
        for code in ("GLASS", "STAFF", "PROCESS", "PART-2", "WBS-1.2"):
            self.assertEqual(_parse_pred_token(code), (code, "FS", 0.0))


if __name__ == "__main__":
    unittest.main()
