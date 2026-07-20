import unittest

from app.model_runtime import unpack_df_runtime


class UnpackDeepFilterRuntimeTests(unittest.TestCase):
    def test_accepts_published_three_item_signature(self) -> None:
        self.assertEqual(
            unpack_df_runtime(("model", "state", "suffix")),
            ("model", "state"),
        )

    def test_accepts_main_four_item_signature(self) -> None:
        self.assertEqual(
            unpack_df_runtime(("model", "state", "suffix", 120)),
            ("model", "state"),
        )

    def test_rejects_incomplete_result(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "incomplete runtime"):
            unpack_df_runtime(("model",))


if __name__ == "__main__":
    unittest.main()
