"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { setThemeAction } from "@/app/actions/auth";

export type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: { key: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { key: "system", label: "Automatic", Icon: Monitor },
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
];

export function ThemePicker({ initial }: { initial: ThemeChoice }) {
  const [choice, setChoice] = useState(initial);
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={choice === key}
          onClick={() => {
            setChoice(key);
            const root = document.documentElement;
            if (key === "system") root.removeAttribute("data-theme");
            else root.setAttribute("data-theme", key);
            start(() => setThemeAction(key));
          }}
          className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
            choice === key ? "bg-accent-soft text-accent ring-2 ring-accent" : "bg-fill text-label"
          }`}
        >
          <Icon aria-hidden size={22} />
          {label}
        </button>
      ))}
    </div>
  );
}
