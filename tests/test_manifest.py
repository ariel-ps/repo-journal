import tomllib
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ManifestContractTests(unittest.TestCase):
    def test_journal_action_contract(self):
        manifest = tomllib.loads((ROOT / "herdr-plugin.toml").read_text())

        self.assertEqual(manifest["id"], "dev.ariel.repo-journal")
        self.assertEqual(manifest["version"], "0.4.3")
        self.assertEqual(
            manifest["build"],
            [{"command": ["sh", "./scripts/build/install.sh"]}],
        )
        self.assertEqual(
            manifest["actions"],
            [
                {
                    "id": "dashboard",
                    "title": "Journal dashboard",
                    "contexts": ["pane", "workspace"],
                    "command": [
                        "zsh",
                        "-c",
                        "source ./shell.zsh && repo-journal",
                    ],
                },
                {
                    "id": "list",
                    "title": "List journal entries",
                    "contexts": ["pane", "workspace"],
                    "command": [
                        "zsh",
                        "-c",
                        "source ./shell.zsh && repo-journal list",
                    ],
                },
            ],
        )

if __name__ == "__main__":
    unittest.main()
