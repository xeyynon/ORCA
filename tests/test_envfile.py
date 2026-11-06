"""envfile: the stdlib .env reader the API uses at start. Run: python -m unittest discover -s tests -v"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import envfile  # noqa: E402


class ParseTests(unittest.TestCase):
    def test_pairs_comments_export_and_quotes(self):
        text = "# comment\n\nA=1\nexport B = two \nC=\"quoted value\"\nD='single'\nnot a pair\n=novalue\n"
        self.assertEqual(envfile.parse(text), {"A": "1", "B": "two", "C": "quoted value", "D": "single"})

    def test_an_empty_value_is_skipped_so_a_blank_placeholder_stays_off(self):
        self.assertEqual(envfile.parse("GROQ_API_KEY=\nX=\"\"\n"), {})

    def test_only_matching_outer_quotes_are_removed(self):
        self.assertEqual(envfile.parse("A=\"half\nB=a=b=c\n"), {"A": "\"half", "B": "a=b=c"})


class LoadTests(unittest.TestCase):
    def write(self, text):
        d = tempfile.TemporaryDirectory()
        self.addCleanup(d.cleanup)
        p = Path(d.name) / ".env"
        p.write_text(text, encoding="utf-8")
        return p

    def test_loads_new_variables_and_never_overrides_the_real_environment(self):
        p = self.write("ORCA_T_NEW=from-file\nORCA_T_SET=from-file\n")
        with mock.patch.dict(os.environ, {"ORCA_T_SET": "from-env"}, clear=False):
            os.environ.pop("ORCA_T_NEW", None)
            self.assertEqual(envfile.load(p), 1)
            self.assertEqual(os.environ["ORCA_T_NEW"], "from-file")
            self.assertEqual(os.environ["ORCA_T_SET"], "from-env")

    def test_a_missing_file_is_not_an_error(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ORCA_ENV_FILE", None)
            self.assertEqual(envfile.load(Path(tempfile.gettempdir()) / "no-such-orca.env"), 0)

    def test_the_real_template_parses_and_sets_no_key(self):
        template = (Path(__file__).resolve().parent.parent / ".env.example").read_text(encoding="utf-8")
        self.assertNotIn("GROQ_API_KEY", envfile.parse(template))


if __name__ == "__main__":
    unittest.main()
