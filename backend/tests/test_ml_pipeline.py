"""Unit tests for DSLIB/4TU ETL parsers, fractional CPM timing, and project-grouped splits."""

import os
import sys
import unittest

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.build_real_dataset import _parse_dslib_duration_days, _parse_dslib_preds  # noqa: E402
from ml.features import FEATURE_NAMES, infer_category, task_features  # noqa: E402
from ml.predictor import analyze_schedule  # noqa: E402
from ml.train import _split_real_projects  # noqa: E402
from schedule_parser import compute_cpm, parse_schedule_document, parse_schedule_file  # noqa: E402


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

    def test_proportional_slip_cap_and_no_double_counting(self):
        csv_bytes = (
            "WBS_Code,Activity_Name,Planned_Duration_Days,Actual_Forecast_Days,Predecessors,Resource_Utilization\n"
            "WBS-1,Raw Material Procurement,6,9,None,0.85\n"
            "WBS-2,Final Shipping & Dispatch,2,2,WBS-1,0.60\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "shipping_chain.csv")
        analysis = analyze_schedule(tasks, "Shipping Chain")
        shipping = analysis["tasks"][1]
        self.assertLessEqual(shipping["conditional_slip_days"], 1.5)
        self.assertGreaterEqual(analysis["p80_slippage_days"], analysis["estimated_project_slippage_days"])
        self.assertGreaterEqual(analysis["estimated_project_slippage_days"], 3.0)

    def test_wbs_summary_rows_stripped_and_dependencies_repointed(self):
        csv_bytes = (
            "WBS Code,Activity Name,Planned Duration,Predecessors\n"
            "1.0,Phase 1 Tooling Summary,12,\n"
            "1.1,Die Design,4,\n"
            "1.2,Rough Milling,8,1.1\n"
            "2.0,Final Quality Audit,3,1.0\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "wbs_rollup.csv")
        codes = [t["code"] for t in tasks]
        self.assertEqual(codes, ["1.1", "1.2", "2.0"])
        self.assertEqual(tasks[2]["predecessors"], ["1.2"])
        self.assertEqual(tasks[2]["start_day"], 12)
        analysis = analyze_schedule(tasks, "WBS Rollup")
        self.assertEqual(analysis["baseline_duration_days"], 15.0)

    def test_date_derived_durations_and_parallel_date_inference(self):
        csv_bytes = (
            "WBS Code,Activity Name,Planned Start,Planned Finish,Actual Finish\n"
            "T-1,SMT Pick and Place,2026-01-01,2026-01-05,2026-01-06\n"
            "T-2,Injection Molding Housing,2026-01-01,2026-01-04,2026-01-04\n"
            "T-3,Final Box Build Assembly,2026-01-05,2026-01-08,2026-01-08\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "dates_no_preds.csv")
        self.assertAlmostEqual(tasks[0]["planned_days"], 4.0)
        self.assertAlmostEqual(tasks[0]["actual_days"], 5.0)
        self.assertAlmostEqual(tasks[1]["planned_days"], 3.0)
        # Parallel branches T-1 and T-2 both start at day 0 (not fake-chained sequentially)
        self.assertEqual(tasks[0]["start_day"], 0)
        self.assertEqual(tasks[1]["start_day"], 0)
        self.assertGreater(tasks[1]["float_days"], 0.0)
        self.assertEqual(tasks[2]["predecessors"], ["T-1"])
        self.assertEqual(tasks[2]["start_day"], 4)

    def test_pdm_ss_and_fs_lag_cpm_and_simulation(self):
        csv_bytes = (
            "WBS Code,Activity Name,Planned Duration,Predecessors,Work Center\n"
            "A,Reactor Batch Mixing,6,,Mixer-1\n"
            "B,HPLC Assay Testing,4,A SS+2d,Lab-1\n"
            "C,Cold Chain Packaging,2,B FS+1d,Pack-1\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "pdm_pharma.csv")
        self.assertEqual(tasks[1]["start_day"], 2)
        self.assertEqual(tasks[2]["start_day"], 7)
        analysis = analyze_schedule(tasks, "PDM Pharma")
        self.assertEqual(analysis["baseline_duration_days"], 9.0)

    def test_universal_archetypes_and_computed_wc_concurrency(self):
        self.assertEqual(infer_category("SMT Reflow Soldering", "Line-A"), "machining")
        self.assertEqual(infer_category("Injection Molding Enclosure", "Press-2"), "stamping")
        self.assertEqual(infer_category("API Synthesis & Tablet Compression", "Batch"), "procurement")
        self.assertEqual(infer_category("AOI & Burn-In Verification", "TestBay"), "quality")

        csv_bytes = (
            "WBS Code,Activity Name,Planned Duration,Work Center,Predecessors\n"
            "P-1,SMT Line Job 1,4,SMT-Line-1,\n"
            "P-2,SMT Line Job 2,4,SMT-Line-1,\n"
        ).encode("utf-8")
        tasks = parse_schedule_file(csv_bytes, "concurrent_smt.csv")
        feats_1 = task_features(tasks[0])
        self.assertGreater(tasks[0].get("computed_utilization", 0.0), 0.78)
        self.assertAlmostEqual(feats_1["resource_utilization"], tasks[0]["computed_utilization"])

    def test_native_xer_and_msp_xml_ingestion(self):
        xer_bytes = (
            "%T\tTASK\n"
            "%F\ttask_id\ttask_code\ttask_type\ttarget_drtn_hr_cnt\ttask_name\tstatus_code\n"
            "%R\t10\tWBS-1\tTT_WBS\t80\tSummary Phase\tTK_Active\n"
            "%R\t11\tX-1\tTT_Task\t32\tWafer Slicing\tTK_Active\n"
            "%R\t12\tX-2\tTT_Task\t24\tAOI Inspection\tTK_Active\n"
            "%T\tTASKPRED\n"
            "%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n"
            "%R\t12\t11\tPR_FS\t8\n"
        ).encode("utf-8")
        xer_res = parse_schedule_document(xer_bytes, "fab.xer")
        self.assertEqual(len(xer_res["tasks"]), 2)
        self.assertAlmostEqual(xer_res["tasks"][0]["planned_days"], 4.0)
        self.assertEqual(xer_res["tasks"][1]["start_day"], 5)

        xml_bytes = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Project xmlns="http://schemas.microsoft.com/project">'
            "<Tasks>"
            "<Task><UID>0</UID><Name>Root</Name><Summary>1</Summary></Task>"
            "<Task><UID>1</UID><WBS>1</WBS><Name>Phase 1</Name><Summary>1</Summary><Duration>PT48H0M0S</Duration></Task>"
            "<Task><UID>2</UID><WBS>1.1</WBS><Name>Cleanroom Assembly</Name><Summary>0</Summary><Duration>PT24H0M0S</Duration></Task>"
            "<Task><UID>3</UID><WBS>1.2</WBS><Name>FAT Acceptance Test</Name><Summary>0</Summary><Duration>PT16H0M0S</Duration>"
            "<PredecessorLink><PredecessorUID>2</PredecessorUID><Type>3</Type><LinkLag>4800</LinkLag></PredecessorLink>"
            "</Task>"
            "</Tasks></Project>"
        ).encode("utf-8")
        xml_res = parse_schedule_document(xml_bytes, "line.xml")
        self.assertEqual(len(xml_res["tasks"]), 2)
        self.assertAlmostEqual(xml_res["tasks"][0]["planned_days"], 3.0)
        self.assertEqual(xml_res["tasks"][1]["start_day"], 1)  # SS+1d from UID 2

    def test_hardened_xer_cp1252_loe_calendar_rsrc_and_active_forecast(self):
        # Latin-1/cp1252 degree/en-dash characters, TT_LOE skipped, 10h calendar, RSRC join, TK_Active forecast
        xer_bytes = (
            "%T\tPROJECT\n"
            "%F\tproj_id\tlast_recalc_date\n"
            "%R\t1\t2026-02-10\n"
            "%T\tCALENDAR\n"
            "%F\tclndr_id\tday_hr_cnt\n"
            "%R\t10\t10\n"
            "%T\tRSRC\n"
            "%F\trsrc_id\trsrc_name\n"
            "%R\t200\tCNC Cell \u2013 Precision\n"
            "%R\t201\tCMM Bay\n"
            "%T\tTASK\n"
            "%F\ttask_id\ttask_code\tclndr_id\ttask_type\tstatus_code\ttarget_drtn_hr_cnt\tremain_drtn_hr_cnt\tact_start_date\ttask_name\n"
            "%R\t1\tLOE-1\t10\tTT_LOE\tTK_Active\t100\t50\t2026-02-01\tProject Management LOE\n"
            "%R\t2\tA-10\t10\tTT_Task\tTK_Active\t40\t30\t2026-02-07\tRough Turning\n"
            "%R\t3\tA-20\t10\tTT_Task\tTK_NotStart\t20\t20\t\tInspection Gate\n"
            "%T\tTASKRSRC\n"
            "%F\ttask_id\trsrc_id\n"
            "%R\t2\t200\n"
            "%R\t2\t201\n"
            "%T\tTASKPRED\n"
            "%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n"
            "%R\t3\t2\tPR_FS\t10\n"
        ).encode("cp1252")
        res = parse_schedule_document(xer_bytes, "plant_p6.xer")
        tasks = res["tasks"]
        # TT_LOE skipped -> 2 tasks left
        self.assertEqual([t["code"] for t in tasks], ["A-10", "A-20"])
        # 40h / 10h per day = 4.0 planned days
        self.assertAlmostEqual(tasks[0]["planned_days"], 4.0)
        # TK_Active: (2026-02-10 - 2026-02-07 = 3.0d elapsed) + (30h / 10h = 3.0d remain) = 6.0d
        self.assertAlmostEqual(tasks[0]["actual_days"], 6.0)
        self.assertEqual(tasks[0]["work_center"], "CNC Cell \u2013 Precision")
        # lag = 10h / 10h = 1d -> A-20 starts at 4 + 1 = 5
        self.assertEqual(tasks[1]["start_day"], 5)

    def test_sf_backward_pass_uses_successor_late_finish(self):
        # P -> S via SF+0d: S cannot finish until P starts.
        # P=3d (ES=0, EF=3), S=2d (ES=0..2), plus longer branch B=8d (ES=0..8) from START=0?
        # Wait: connect P -(SF+0d)-> S -(FS+0d)-> END(4d), so EF_S >= ES_P=0 -> S is 0..2, END is 2..6.
        # Comp_end = 6. LF_S = 2, LS_S = 0.
        # Backward SF constraint: ES_P + 0 <= LF_S (= 2) -> LS_P <= 2 -> LF_P = min(comp_end=6, LF_S + dur_P = 2 + 3 = 5).
        # Float_P = LF_P - EF_P = 5 - 3 = 2.0 (NOT LS_S + dur_P = 0 + 3 = 3 -> float 0!).
        tasks = compute_cpm([
            {
                "code": "P",
                "task": "Predecessor Task",
                "planned_days": 3.0,
                "actual_days": 3.0,
                "predecessors": [],
                "has_dependency_column": True,
            },
            {
                "code": "S",
                "task": "SF Successor",
                "planned_days": 2.0,
                "actual_days": 2.0,
                "predecessors": ["P"],
                "pred_links": [{"code": "P", "rel": "SF", "lag_days": 0.0}],
                "has_dependency_column": True,
            },
            {
                "code": "END",
                "task": "Final Test",
                "planned_days": 4.0,
                "actual_days": 4.0,
                "predecessors": ["S"],
                "has_dependency_column": True,
            },
        ])
        self.assertAlmostEqual(tasks[0]["float_days"], 2.0)


if __name__ == "__main__":
    unittest.main()
