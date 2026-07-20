import json
from pathlib import Path

from app.main import read_status, write_status


def test_status_updates_are_merged(tmp_path: Path) -> None:
    (tmp_path / "status.json").write_text(json.dumps({"id": "one", "progress": 5}))
    result = write_status(tmp_path, progress=42, phase="enhancing")
    assert result == {"id": "one", "progress": 42, "phase": "enhancing"}
    assert read_status(tmp_path)["progress"] == 42
