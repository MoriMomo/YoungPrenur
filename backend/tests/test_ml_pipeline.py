"""Unit tests for DSLIB/4TU ETL parsers, fractional CPM timing, and project-grouped splits."""

import os
import sys
import unittest

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.build_real_dataset import _parse_dslib_duration_days, _parse_dslib_preds  # noqa: E402
from ml.features import FEATURE_NAMES  # noqa: E402
from ml.train import _split_real_projects  # noqa: E402
from schedule_parser import parse_schedule_file  # noqa: E402


class TestMlPipeline(unittest.TestCase):
    def test_dslib_duration_parsing(self):
        self.assertEqual(_parse_dslib_duration_days("1d"), 1.0)
        self.assertEqual(_parse_dslib_duration_days("4h"), 0.5)
        self.assertEqual(_parse_dslib_duration_days("2w"), 10.0)
        self.assertIsNone(_parse_dslib_duration_days(None))

    def test_dslib_predecessor_parsing_ignores_lags(self):
        self.assertEqual(_parse_dslib_preds("9SS+3d"), ["9"])
        self.assertEqual(_parse_dslib_preds("3FS;7FS"), ["3", "7"])

    def test_fractional_shift_days_and_cpm(self):
        csv_bytes = (
            "WBS_Code,Activity_Name,Planned_Duration_Days,Actual_Forecast_Days,Predecessors\n"
            "OP-1,Turning - Machine 4,0.4,0.8,None\n"
            "OP-2,Turning & Milling Q.C.,0.5,0.5,OP-1\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "fractional_cnc.csv")
        self.assertEqual(len(tasks), 2)
        self.assertAlmostEqual(tasks[0]["planned_days"], 0.4)
        self.assertAlmostEqual(tasks[0]["actual_days"], 0.8)
        self.assertEqual(tasks[0]["float_days"], 0.0)
        self.assertTrue(tasks[0]["critical"])
        self.assertAlmostEqual(tasks[1]["upstream_slip_days"], 0.4)

    def test_stratified_real_project_split_no_leakage(self):
        rows = []
        for src in ("dslib", "cnc"):
            for p_idx in range(5):
                pid = f"real_{src}_P{p_idx}"
                for t_idx in range(2):
                    row = {f: 0.0 for f in FEATURE_NAMES}
                    row.update({"project_id": pid, "late": t_idx % 2})
                    rows.append(row)
        df = pd.DataFrame(rows)
        df_tr, df_te = _split_real_projects(df)
        tr_pids = set(df_tr["project_id"])
        te_pids = set(df_te["project_id"])
        self.assertEqual(tr_pids & te_pids, set())
        self.assertIn("dslib", set(df_tr["_source"]))
        self.assertIn("cnc", set(df_tr["_source"]))
        self.assertIn("dslib", set(df_te["_source"]))
        self.assertIn("cnc", set(df_te["_source"]))


if __name__ == "__main__":
    unittest.main()
