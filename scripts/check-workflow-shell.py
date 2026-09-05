#!/usr/bin/env python3
"""
Valida a SINTAXE de todo shell embutido nos workflows do GitHub Actions.

Um erro de aspas no script de deploy só aparece com o job já rodando — depois
do login no registry, no meio do caminho, com o deploy pela metade. `bash -n`
faz parse sem executar nada e pega aspas desbalanceadas, `fi`/`done` faltando e
afins, em milissegundos.

Não valida semântica (comando inexistente, variável errada) — para isso não há
atalho barato.

Uso: python3 scripts/check-workflow-shell.py
Sai com 1 se algum script não fizer parse.
"""

import pathlib
import subprocess
import sys

import yaml

WORKFLOWS = pathlib.Path(".github/workflows")


def scripts_of(workflow: dict):
    """Todo shell do workflow: `run:` dos steps e `with.script` (ssh-action)."""
    for job_name, job in (workflow.get("jobs") or {}).items():
        for i, step in enumerate((job or {}).get("steps") or []):
            name = step.get("name", f"step {i}")
            if step.get("run"):
                yield f"{job_name} → {name}", step["run"]
            script = (step.get("with") or {}).get("script")
            if script:
                yield f"{job_name} → {name} (ssh)", script


def main() -> int:
    failures = 0
    for path in sorted(WORKFLOWS.glob("*.y*ml")):
        workflow = yaml.safe_load(path.read_text()) or {}
        for label, script in scripts_of(workflow):
            result = subprocess.run(
                ["bash", "-n"], input=script, text=True, capture_output=True
            )
            if result.returncode:
                failures += 1
                print(f"ERRO  {path.name}: {label}")
                for line in result.stderr.strip().splitlines():
                    print(f"      {line}")
            else:
                print(f"ok    {path.name}: {label}")

    if failures:
        print(f"\n{failures} script(s) com erro de sintaxe.", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
