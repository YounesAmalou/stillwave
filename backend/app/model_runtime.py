from __future__ import annotations

from typing import Any, Sequence


def unpack_df_runtime(initialized: Sequence[Any]) -> tuple[Any, Any]:
    """Return the stable model/state pair across DeepFilterNet API versions."""
    if len(initialized) < 2:
        raise RuntimeError("DeepFilterNet initialization returned an incomplete runtime")
    return initialized[0], initialized[1]
