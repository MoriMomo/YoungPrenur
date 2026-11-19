"""Paths and defaults shared across the backend.
"""

import os


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


DEFAULT_SCHEDULE_FILENAME = "master_project_schedule_rev3.csv"


DEFAULT_SCHEDULE_PATH = os.path.join(DATA_DIR, DEFAULT_SCHEDULE_FILENAME)


DEFAULT_PROJECT_NAME = "Project Alpha - Precision Stamping & Aerospace Tooling"
