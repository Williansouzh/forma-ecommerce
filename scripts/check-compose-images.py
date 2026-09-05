#!/usr/bin/env python3
"""
Verifica que toda imagem FIXA dos composes existe no registry.

`docker compose pull` aborta por inteiro quando UMA imagem não resolve, e o
deploy roda com `set -e`. Uma tag digitada errada num serviço auxiliar — um
sidecar de backup, por exemplo — impede a subida da aplicação inteira, e o erro
só aparece no servidor.

Imagens construídas pelo próprio compose (`build:`) ou vindas de variável
(`${API_IMAGE}`) são puladas: não existem no registry no momento da checagem.

Falha SÓ quando o registry diz que a tag não existe. Erro de rede ou limite de
requisição vira aviso — um check de pré-voo que reprova por instabilidade
alheia é abandonado na primeira semana.

Uso: python3 scripts/check-compose-images.py [compose.yml ...]
"""

import pathlib
import re
import subprocess
import sys

import yaml

DEFAULT_FILES = ["docker-compose.yml", "docker-compose.prod.yml"]

# Mensagens que significam "esta tag não existe" — o bug que queremos pegar.
NOT_FOUND = ("manifest unknown", "not found", "no such manifest", "unauthorized")


def pinned_images(path: pathlib.Path) -> set[str]:
    data = yaml.safe_load(path.read_text()) or {}
    images = set()
    for service in (data.get("services") or {}).values():
        service = service or {}
        if service.get("build"):
            continue
        image = service.get("image")
        if image and not re.search(r"\$\{", image):
            images.add(image)
    return images


def exists(image: str) -> tuple[bool, str]:
    result = subprocess.run(
        ["docker", "manifest", "inspect", image], capture_output=True, text=True
    )
    if result.returncode == 0:
        return True, ""
    return False, (result.stderr or "").strip()


def main(argv: list[str]) -> int:
    files = [pathlib.Path(f) for f in (argv or DEFAULT_FILES)]
    missing, flaky = [], []

    for path in files:
        if not path.exists():
            continue
        for image in sorted(pinned_images(path)):
            ok, err = exists(image)
            if ok:
                print(f"ok      {image}")
            elif any(marker in err.lower() for marker in NOT_FOUND):
                missing.append((image, path.name, err))
                print(f"AUSENTE {image}  ({path.name})")
            else:
                flaky.append((image, err))
                print(f"aviso   {image} — não deu para verificar")

    for image, err in flaky:
        first = err.splitlines()[0] if err else ""
        print(f"\naviso: {image}\n  {first}", file=sys.stderr)

    if missing:
        print("\nImagens inexistentes — o deploy falharia no `compose pull`:", file=sys.stderr)
        for image, file_name, err in missing:
            first = err.splitlines()[0] if err else ""
            print(f"  {image}  ({file_name})", file=sys.stderr)
            print(f"    {first}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
