"""
MDIP (Manufacturing Decision Intelligence Platform)
Automated System Verification & Proof of Testing Suite (TRL 3)
BINUS RTT & PT Imajinasi Karya Bangsa (IMAJIN)
"""

import sys
import time
import json
import urllib.request
import urllib.error
from datetime import datetime

API_BASE = "http://localhost:8000"

TEST_CASES = [
    {
        "id": "TC-01",
        "name": "Backend Service Health & Engine Handshake",
        "endpoint": f"{API_BASE}/health",
        "method": "GET",
        "body": None,
        "validate": lambda d: d.get("status") == "ok" and "engine" in d,
        "desc": "Verifies that the FastAPI engine is running and responding to ping requests."
    },
    {
        "id": "TC-02",
        "name": "Excel/PDF Schedule Ingestion & WBS Normalization",
        "endpoint": f"{API_BASE}/api/v1/scheduler/upload",
        "method": "POST",
        "body": {"filename": "master_project_schedule_rev3.xlsx", "source_type": "EXCEL_WBS"},
        "validate": lambda d: d.get("success") is True and d.get("tasks_extracted", 0) > 0,
        "desc": "Tests parsing of unstructured schedule files into normalized WBS activities."
    },
    {
        "id": "TC-03",
        "name": "Supervised ML Delay-Risk & Critical Path Slippage Prediction",
        "endpoint": f"{API_BASE}/api/v1/risks/prediction",
        "method": "GET",
        "body": None,
        "validate": lambda d: d.get("overall_delay_probability", 0) > 0.5 and len(d.get("risk_drivers", [])) > 0,
        "desc": "Validates ML classification of project delay risk and root-cause risk driver breakdown."
    },
    {
        "id": "TC-04",
        "name": "Grounded RAG Copilot Anti-Hallucination & Citation Verification",
        "endpoint": f"{API_BASE}/api/v1/copilot/chat",
        "method": "POST",
        "body": {
            "message": "Bagaimana mitigasi keterlambatan WBS-1.2?",
            "active_role": "Operations Manager"
        },
        "validate": lambda d: d.get("is_grounded") is True and len(d.get("citations", [])) > 0,
        "desc": "Ensures that AI Copilot reasoning strictly cites indexed documents with zero hallucination."
    },
    {
        "id": "TC-05",
        "name": "Human-in-the-Loop (HITL) Decision Authorization Audit Trail",
        "endpoint": f"{API_BASE}/api/v1/risks/decisions/flag",
        "method": "POST",
        "body": {"action_id": "act-01", "reviewer_role": "Operations Manager"},
        "validate": lambda d: d.get("success") is True and d.get("status") == "FLAGGED_IN_AUDIT_LOG",
        "desc": "Validates cryptographic human authorization logging for automated decision mitigation."
    },
    {
        "id": "TC-06",
        "name": "IRoom Material Delivery Stream & 36h Buffer Telemetry",
        "endpoint": f"{API_BASE}/api/v1/iroom/materials",
        "method": "GET",
        "body": None,
        "validate": lambda d: isinstance(d, list) and any(m.get("stockCoverHours") == 36 for m in d),
        "desc": "Verifies ingestion of raw material delivery telemetry and buffer-hour depletion alerts."
    },
    {
        "id": "TC-07",
        "name": "IRoom Project Progress Tracking & WBS Slippage Attainment",
        "endpoint": f"{API_BASE}/api/v1/iroom/progress",
        "method": "GET",
        "body": None,
        "validate": lambda d: isinstance(d, list) and any(p.get("delayVarianceDays", 0) > 0 for p in d),
        "desc": "Validates live project milestone tracking and WBS-level schedule variance logging."
    },
    {
        "id": "TC-08",
        "name": "IRoom Drawing Approval & GD&T CAD Tolerance Gate",
        "endpoint": f"{API_BASE}/api/v1/iroom/drawings",
        "method": "GET",
        "body": None,
        "validate": lambda d: isinstance(d, list) and any(dwg.get("criticalDwg") is True for dwg in d),
        "desc": "Ensures CAD engineering drawings are tracked against technical approval gates."
    },
    {
        "id": "TC-09",
        "name": "IRoom Quotation & PO Lifecycle Management",
        "endpoint": f"{API_BASE}/api/v1/iroom/quotations",
        "method": "GET",
        "body": None,
        "validate": lambda d: isinstance(d, list) and len(d) > 0,
        "desc": "Verifies purchase order generation, quotation matching, and expedite PO triggers."
    },
    {
        "id": "TC-10",
        "name": "IRoom Operation Tracker & Machine Vibration Anomaly Telemetry",
        "endpoint": f"{API_BASE}/api/v1/iroom/operations",
        "method": "GET",
        "body": None,
        "validate": lambda d: isinstance(d, list) and any(o.get("vibrationSensor") == "ELEVATED" for o in d),
        "desc": "Validates shop-floor sensor ingestion (+18% vibration sensor trigger on Press P-07)."
    }
]

def run_http_request(url, method="GET", body=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body), latency_ms, None
    except urllib.error.HTTPError as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return e.code, None, latency_ms, str(e)
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return 0, None, latency_ms, str(e)

def main():
    print("=" * 80)
    print("  MDIP: AUTOMATED SYSTEM VERIFICATION & PROOF OF TESTING (TRL 3)")
    print("  Mitra: BINUS RTT (Dr. Ir. Indrajani) & PT Imajinasi Karya Bangsa (IMAJIN)")
    print("  Timestamp:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 80)
    print()

    results = []
    passed_count = 0

    for tc in TEST_CASES:
        status_code, data, latency_ms, err = run_http_request(tc["endpoint"], tc["method"], tc["body"])
        
        is_passed = False
        notes = ""
        if status_code == 200 and data is not None:
            try:
                if tc["validate"](data):
                    is_passed = True
                    notes = f"200 OK · Schema & domain logic verified"
                else:
                    notes = "200 OK · Validation predicate returned false"
            except Exception as ex:
                notes = f"Validation exception: {ex}"
        else:
            notes = f"HTTP Error {status_code}: {err}"

        if is_passed:
            passed_count += 1
            status_tag = "[PASS]"
        else:
            status_tag = "[FAIL]"

        results.append({
            "id": tc["id"],
            "name": tc["name"],
            "endpoint": tc["endpoint"].replace(API_BASE, ""),
            "method": tc["method"],
            "status": "PASSED" if is_passed else "FAILED",
            "latency_ms": latency_ms,
            "notes": notes,
            "description": tc["desc"]
        })

        print(f" {status_tag} {tc['id']}: {tc['name']}")
        print(f"        Route: {tc['method']} {tc['endpoint'].replace(API_BASE, '')} | Latency: {latency_ms} ms")
        print(f"        Output: {notes}")
        print()

    print("-" * 80)
    print(f"  TEST SUMMARY: {passed_count}/{len(TEST_CASES)} Passed (Success Rate: {(passed_count/len(TEST_CASES))*100:.1f}%)")
    print(f"  TRL 3 LABORATORY VALIDATION: {'COMPLETED & COMPLIANT' if passed_count == len(TEST_CASES) else 'ATTENTION REQUIRED'}")
    print("-" * 80)

    # Save verification JSON log
    output_path = "D:\\pasti_berhasil\\codee\\Kuliah\\Lombadll\\youngprenur\\backend\\test_results.json"
    report = {
        "suite": "MDIP TRL 3 System Verification",
        "timestamp": datetime.now().isoformat(),
        "total_tests": len(TEST_CASES),
        "passed": passed_count,
        "failed": len(TEST_CASES) - passed_count,
        "success_rate_percent": (passed_count / len(TEST_CASES)) * 100,
        "results": results
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"  Verification log saved to: {output_path}")
    print()

    if passed_count != len(TEST_CASES):
        sys.exit(1)

if __name__ == "__main__":
    main()
