"""
Environment variable loading for Spoke matching service.
"""

import os
from typing import List


# TODO(supabase): Set these in .env or Railway environment when deploying
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Algorithm configuration
DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))
MAX_DEADHEAD_MILES: int = int(os.getenv("MAX_DEADHEAD_MILES", "150"))
MAX_FRESHNESS_WINDOW_HOURS: int = int(os.getenv("MAX_FRESHNESS_WINDOW_HOURS", "72"))

SOUTHEAST_STATES: List[str] = os.getenv(
    "SOUTHEAST_STATES", "SC,GA,NC,FL"
).split(",")

# Local data store path (used when Supabase is not configured)
DATA_STORE_PATH: str = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "store.json"
)
