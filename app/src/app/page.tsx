"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { COMMANDS, CATEGORIES, type Command } from "@/lib/commands";

function useApiKey() {
  const [apiKey, setApiKeyState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key") ?? "";
    setApiKeyState(stored);
    setLoaded(true);
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem("anthropic_api_key", key);
    } else {
      localStorage.removeItem("anthropic_api_key");
    }
  }, []);

  return { apiKey, setApiKey, loaded };
}

function SettingsModal({
  apiKey,
  onSave,
  onClose,
}: {
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(apiKey);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-terminal-surface)] border border-[var(--color-terminal-border)] rounded-lg w-full max-w-md p-6">
        <h2 className="text-[var(--color-terminal-green)] font-bold mb-1">API Key</h2>
        <p className="text-[var(--color-terminal-muted)] text-xs mb-4">
          Enter your Anthropic API key. Stored locally in your browser only.
        </p>
        <input
          ref={inputRef}
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full bg-[var(--color-terminal-bg)] border border-[var(--color-terminal-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--color-terminal-accent)] mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(draft);
              onClose();
            }
          }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded border border-[var(--color-terminal-border)] text-[var(--color-terminal-muted)] hover:text-[var(--color-terminal-text)] transition-colors"
          >
            Cancel
          </button>
          {apiKey && (
            <button
              onClick={() => { onSave(""); onClose(); }}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-terminal-red)] text-[var(--color-terminal-red)] hover:bg-[var(--color-terminal-red)] hover:text-[var(--color-terminal-bg)] transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="text-xs px-3 py-1.5 rounded bg-[var(--color-terminal-accent)] text-[var(--color-terminal-bg)] font-semibold hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-terminal-muted)] mt-3">
          Get your key at console.anthropic.com. Your key is sent directly to Anthropic&apos;s API and never stored on our servers.
        </p>
      </div>
    </div>
  );
}

function CommandPalette({
  filter,
  onSelect,
  visible,
}: {
  filter: string;
  onSelect: (cmd: Command) => void;
  visible: boolean;
}) {
  const filtered = useMemo(() => {
    if (!filter) return COMMANDS.slice(0, 10);
    const q = filter.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [filter]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-terminal-surface)] border border-[var(--color-terminal-border)] rounded-lg shadow-2xl max-h-72 overflow-y-auto z-10">
      {filtered.map((cmd) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-terminal-border)] flex items-center gap-3 transition-colors"
        >
          <span className="text-[var(--color-terminal-accent)] font-semibold text-sm min-w-[160px]">
            {cmd.name}
          </span>
          <span className="text-[var(--color-terminal-muted)] text-xs flex-1">
            {cmd.description}
          </span>
          <span className="text-[var(--color-terminal-border)] text-xs">
            {cmd.category}
          </span>
        </button>
      ))}
    </div>
  );
}

function WelcomeScreen({ onCommand }: { onCommand: (text: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3 font-bold text-[var(--color-terminal-green)]">
            $ finance-agent
          </div>
          <p className="text-[var(--color-terminal-muted)] text-sm">
            AI-powered financial analysis &mdash; DCF, comps, earnings, LBO, M&amp;A, and more
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="border border-[var(--color-terminal-border)] rounded-lg p-4 bg-[var(--color-terminal-surface)]"
            >
              <h3 className="text-[var(--color-terminal-accent)] text-sm font-semibold mb-3">
                {cat}
              </h3>
              <div className="space-y-1.5">
                {COMMANDS.filter((c) => c.category === cat)
                  .slice(0, 4)
                  .map((cmd) => (
                    <button
                      key={cmd.name}
                      onClick={() =>
                        onCommand(`${cmd.name}${cmd.hint ? " " + cmd.hint : ""}`)
                      }
                      className="block w-full text-left text-xs hover:text-[var(--color-terminal-accent)] transition-colors py-0.5"
                    >
                      <span className="text-[var(--color-terminal-green)]">{cmd.name}</span>{" "}
                      <span className="text-[var(--color-terminal-muted)]">
                        {cmd.description}
                      </span>
                    </button>
                  ))}
                {COMMANDS.filter((c) => c.category === cat).length > 4 && (
                  <span className="text-[var(--color-terminal-border)] text-xs">
                    +{COMMANDS.filter((c) => c.category === cat).length - 4} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[var(--color-terminal-muted)] text-xs mt-8">
          Type a command or ask any financial question. Use / to see all commands.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { apiKey, setApiKey, loaded } = useApiKey();
  const [showSettings, setShowSettings] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, error } =
    useChat({ body: { apiKey } });

  const [showPalette, setShowPalette] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (loaded && !apiKey) setShowSettings(true);
  }, [loaded, apiKey]);

  const paletteFilter = input.startsWith("/") ? input.slice(1) : "";

  function handleCommandSelect(cmd: Command) {
    setInput(`${cmd.name} `);
    setShowPalette(false);
    inputRef.current?.focus();
  }

  function handleCommand(text: string) {
    if (!apiKey) { setShowSettings(true); return; }
    setInput(text);
    setTimeout(() => { inputRef.current?.form?.requestSubmit(); }, 0);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleInputChange(e);
    setShowPalette(e.target.value.startsWith("/"));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!apiKey) { e.preventDefault(); setShowSettings(true); return; }
    handleSubmit(e);
  }

  return (
    <div className="h-screen flex flex-col">
      {showSettings && (
        <SettingsModal apiKey={apiKey} onSave={setApiKey} onClose={() => setShowSettings(false)} />
      )}

      <header className="border-b border-[var(--color-terminal-border)] px-6 py-3 flex items-center justify-between shrink-0 bg-[var(--color-terminal-surface)]">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-terminal-green)] font-bold text-lg">$</span>
          <span className="font-semibold">finance-agent</span>
          <span className="text-[var(--color-terminal-muted)] text-xs border border-[var(--color-terminal-border)] rounded px-2 py-0.5">
            claude-sonnet-4
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-terminal-muted)]">
          <span>{COMMANDS.length} commands</span>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-1.5 hover:text-[var(--color-terminal-text)] transition-colors ${!apiKey ? "text-[var(--color-terminal-red)]" : ""}`}
          >
            <span className={`w-2 h-2 rounded-full ${!apiKey ? "bg-[var(--color-terminal-red)]" : isLoading ? "bg-[var(--color-terminal-amber)] animate-pulse" : "bg-[var(--color-terminal-green)]"}`} />
            {!apiKey ? "no key" : isLoading ? "thinking..." : "ready"}
          </button>
        </div>
      </header>

      {error && (
        <div className="px-6 py-2 bg-[var(--color-terminal-red)]/10 border-b border-[var(--color-terminal-red)]/30 text-[var(--color-terminal-red)] text-xs">
          {error.message.includes("401") ? "Invalid API key. Click the status indicator to update." : error.message}
        </div>
      )}

      {messages.length === 0 ? (
        <WelcomeScreen onCommand={handleCommand} />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className="max-w-4xl mx-auto">
              <div className="flex items-start gap-3">
                <span className={`text-xs font-bold mt-1 min-w-[60px] ${m.role === "user" ? "text-[var(--color-terminal-green)]" : "text-[var(--color-terminal-accent)]"}`}>
                  {m.role === "user" ? "you >" : "agent >"}
                </span>
                <div className="flex-1 min-w-0">
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="prose text-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold mt-1 min-w-[60px] text-[var(--color-terminal-accent)]">agent &gt;</span>
                <span className="cursor-blink text-sm text-[var(--color-terminal-muted)]">analyzing</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="border-t border-[var(--color-terminal-border)] p-4 bg-[var(--color-terminal-surface)] shrink-0">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto relative">
          <CommandPalette filter={paletteFilter} onSelect={handleCommandSelect} visible={showPalette} />
          <div className="flex items-center gap-3 bg-[var(--color-terminal-bg)] border border-[var(--color-terminal-border)] rounded-lg px-4 py-3 focus-within:border-[var(--color-terminal-accent)] transition-colors">
            <span className="text-[var(--color-terminal-green)] font-bold text-sm">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={onInputChange}
              placeholder={apiKey ? "Type a command (/dcf AAPL) or ask a question..." : "Set your API key first (click status indicator)..."}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-terminal-muted)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="text-xs px-3 py-1.5 rounded bg-[var(--color-terminal-accent)] text-[var(--color-terminal-bg)] font-semibold disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              Run
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-terminal-muted)] mt-2 text-center">
            Type / to browse commands &middot; Enter to send &middot; Not financial advice
          </p>
        </form>
      </div>
    </div>
  );
}
