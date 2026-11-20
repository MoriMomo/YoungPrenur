"""Database setup migrations: old seeded sample names are refreshed, user data is left alone."""

import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ.setdefault("MDIP_DB_PATH", os.path.join(_TMP_DIR.name, "test_setup.db"))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database  # noqa: E402
from database import _core  # noqa: E402

SEEDED_SUPPLIER_ID = database.INITIAL_IROOM_DATA["materials"][0]["id"]


class TestRetiredSampleNames(unittest.TestCase):
    def setUp(self):
        self._env = patch.dict(os.environ, {}, clear=False)
        self._env.start()
        for key in ("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_KEY", "SUPABASE_ANON_KEY"):
            os.environ.pop(key, None)
        self._orig_db = database.DB_PATH
        self._tmp = tempfile.TemporaryDirectory()
        database.DB_PATH = os.path.join(self._tmp.name, "setup.db")
        database.init_db()

    def tearDown(self):
        database.DB_PATH = self._orig_db
        self._env.stop()
        self._tmp.cleanup()

    def _payload(self, stream, record_id):
        with _core._connect() as conn:
            row = conn.execute(
                "SELECT payload_json FROM iroom_records WHERE stream = ? AND record_id = ?", (stream, record_id)
            ).fetchone()
        return json.loads(row["payload_json"]) if row else None

    def test_seeded_row_with_old_name_is_refreshed(self):
        stale = dict(database.INITIAL_IROOM_DATA["materials"][0], supplier="PT Metalindo Perkasa Steel")
        database.upsert_stream_records("materials", [stale])
        self.assertEqual(self._payload("materials", SEEDED_SUPPLIER_ID)["supplier"], "PT Metalindo Perkasa Steel")

        database.init_db()
        self.assertEqual(
            self._payload("materials", SEEDED_SUPPLIER_ID)["supplier"],
            database.INITIAL_IROOM_DATA["materials"][0]["supplier"],
        )

    def test_user_added_and_edited_rows_are_untouched(self):
        own = {"id": "mat-user-1", "partNumber": "USER-PART", "supplier": "Nippon Steel Indonesia Dist."}
        edited = dict(database.INITIAL_IROOM_DATA["materials"][1], supplier="Local supplier we use now")
        database.upsert_stream_records("materials", [own, edited])

        database.init_db()
        self.assertEqual(self._payload("materials", "mat-user-1")["supplier"], "Nippon Steel Indonesia Dist.")
        self.assertEqual(self._payload("materials", edited["id"])["supplier"], "Local supplier we use now")

    def test_current_seed_has_no_retired_names(self):
        from database.setup import _has_retired_names

        self.assertFalse(_has_retired_names(json.dumps(database.INITIAL_IROOM_DATA)))


if __name__ == "__main__":
    unittest.main()
