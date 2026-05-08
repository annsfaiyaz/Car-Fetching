"""Remove every row from ``pakwheels_listings``.

Usage (from repo):

  cd car-fetching/backend && .venv/bin/python scripts/clear_all_listings.py

Uses the same ``SQLITE_DATABASE_URL`` / default path as the API.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_BACK = Path(__file__).resolve().parent.parent
if str(_BACK) not in sys.path:
    sys.path.insert(0, str(_BACK))


async def main() -> None:
    from dotenv import load_dotenv
    from sqlalchemy import func, select, text

    load_dotenv(_BACK / ".env")

    from database_models import PakwheelsListing
    from db import close_db, connect_db, get_async_session_factory

    await connect_db()
    sf = get_async_session_factory()
    async with sf() as session:
        n = await session.scalar(select(func.count()).select_from(PakwheelsListing))
        before = int(n or 0)
        await session.execute(text("DELETE FROM pakwheels_listings"))
        await session.commit()
    await close_db()
    print(f"Deleted all listing rows (was {before} row(s)).")


if __name__ == "__main__":
    asyncio.run(main())
