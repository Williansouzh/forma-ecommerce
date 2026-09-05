#!/usr/bin/env python3
"""
Falha em vulnerabilidade high/critical de produção que não esteja na lista de
exceções documentadas abaixo.

Por que não `npm audit --audit-level=high` puro: hoje as três descobertas vêm
de cópias que o próprio Next carrega, e a única correção é subir de major.
Um passo que fica vermelho por meses e ninguém pode consertar deixa de ser
lido — e aí a vulnerabilidade NOVA passa junto. Com allowlist, o que já foi
avaliado fica registrado e qualquer coisa fora dela quebra o build.

Cada exceção precisa de: pacote, motivo e a condição que a remove.

Uso: python3 scripts/check-audit.py [--dir api]
"""

import argparse
import json
import subprocess
import sys

# pacote -> (motivo, condição de saída)
ALLOWED = {
    "next": (
        "As descobertas são das cópias de postcss e sharp aninhadas dentro do "
        "próprio next@15.5; o pacote em si não tem advisory.",
        "Sai junto com o upgrade para o Next 16.",
    ),
    "postcss": (
        "Vem de node_modules/next/node_modules/postcss. Os vetores são leitura "
        "de sourceMappingURL e stringify de CSS — ambos em build, sobre CSS "
        "que é nosso. Nada de terceiro entra no pipeline de estilo.",
        "Sai junto com o upgrade para o Next 16.",
    ),
    "sharp": (
        "Vem de node_modules/next/node_modules/sharp@0.34.5. A dependência "
        "direta do projeto já é 0.35.3, acima da faixa afetada; a cópia "
        "aninhada só processa as imagens do próprio repositório.",
        "Sai junto com o upgrade para o Next 16.",
    ),
}

BLOCKING = {"high", "critical"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default=".")
    args = parser.parse_args()

    result = subprocess.run(
        ["npm", "audit", "--omit=dev", "--json"],
        cwd=args.dir,
        capture_output=True,
        text=True,
    )
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Não deu para ler a saída do npm audit:", file=sys.stderr)
        print(result.stderr.strip()[:400], file=sys.stderr)
        return 1

    unexpected = []
    accepted = []
    for name, entry in (report.get("vulnerabilities") or {}).items():
        if entry.get("severity") not in BLOCKING:
            continue
        (accepted if name in ALLOWED else unexpected).append(name)

    for name in sorted(accepted):
        motivo, saida = ALLOWED[name]
        print(f"aceita  {name} — {motivo} {saida}")

    if unexpected:
        print("\nVulnerabilidades high/critical fora da allowlist:", file=sys.stderr)
        for name in sorted(unexpected):
            entry = report["vulnerabilities"][name]
            links = [v.get("url") for v in entry.get("via", []) if isinstance(v, dict)]
            print(f"  {name} ({entry['severity']})", file=sys.stderr)
            for link in links[:3]:
                print(f"    {link}", file=sys.stderr)
        print(
            "\nCorrija, ou registre a exceção em scripts/check-audit.py com "
            "motivo e condição de saída.",
            file=sys.stderr,
        )
        return 1

    print(f"ok    nenhuma vulnerabilidade high/critical fora da allowlist ({args.dir})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
