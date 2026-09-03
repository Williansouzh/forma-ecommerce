"use client";

import { useEffect, useState } from "react";

/**
 * Controle discreto no rodapé, escrito por extenso.
 * O par sol/lua no header era affordance de ferramenta de desenvolvedor —
 * loja de decoração não pergunta ao cliente qual tema ele quer, mas também
 * não deixa quem prefere o escuro sem saída.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  const toggle = () => {
    const next = document.documentElement.classList.toggle("dark");
    setDark(next);
    try {
      localStorage.setItem("forma-theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      // Sem rótulo até hidratar, para não piscar o estado errado.
      className="nav-link text-body-small text-tertiary transition-colors duration-300 hover:text-primary"
    >
      {ready ? (dark ? "Luz do dia" : "Luz baixa") : "Luz baixa"}
    </button>
  );
}
