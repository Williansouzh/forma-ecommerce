#!/usr/bin/env python3
"""
Falha se um GitHub Action remoto não estiver fixado em commit SHA.

Tag como `@v4` é mutável: quem publica a Action pode reapontá-la a qualquer
momento, e o CI passa a executar código que ninguém revisou. SHA de 40
caracteres é imutável.
"""

import pathlib
import re
import sys

WORKFLOWS = pathlib.Path(".github/workflows")
USES = re.compile(r"^\s*(?:-\s*)?uses:\s*([^\s#]+)", re.MULTILINE)
FULL_SHA = re.compile(r"^[0-9a-f]{40}$")


def main() -> int:
    failures: list[str] = []
    checked = 0

    for path in sorted(WORKFLOWS.glob("*.y*ml")):
        text = path.read_text()
        for match in USES.finditer(text):
            target = match.group(1)
            # Action local do próprio repo já está no commit em revisão.
            if target.startswith("./"):
                continue
            checked += 1
            line = text.count("\n", 0, match.start()) + 1
            if "@" not in target:
                failures.append(f"{path}:{line}: {target}")
                continue
            reference = target.rsplit("@", 1)[1]
            if not FULL_SHA.fullmatch(reference):
                failures.append(f"{path}:{line}: {target}")

    if failures:
        print("Actions remotos sem SHA imutável:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        return 1

    print(f"ok    {checked} referência(s) de Actions fixadas por SHA")
    return 0


if __name__ == "__main__":
    sys.exit(main())
