import { useState, useCallback } from "react";
import { HANGUL_LETTERS, LETTER_PRONUNCIATION } from "./constants";
import { speakKoreanAudio } from "./audioUtils";
import MusicScreen from "./MusicScreen";
import { QuizScreen, QuizModeSelect } from "./QuizComponents";
import DrawingPractice from "./DrawingPractice";
import ReadingPractice from "./ReadingPractice";
import MemoryGame from "./MemoryGame";

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function KoreanApp() {
  const [view, setView] = useState("translator");
  const [quizMode, setQuizMode] = useState(null);

  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [noteInEnglish, setNoteInEnglish] = useState(false);
  const [hoveredLetter, setHoveredLetter] = useState(null);

  const translate = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNoteInEnglish(false);
    try {
      const res = await fetch("http://localhost:8000/api/translate/korean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Translation failed");
      if (!data.hangul || !data.romanized) throw new Error("Invalid response format from model");
      setResult(data);
    } catch (err) {
      setError(err.message || "Translation failed. Please try again.");
    }
    setLoading(false);
  }, [input]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    });
  };

  const pronounceKorean = (text) => {
    const cleanText = text.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
    speakKoreanAudio(cleanText, { rate: 0.8 });
  };

  const pronounceLetter = (hangul) => {
    const text = LETTER_PRONUNCIATION[hangul] ?? hangul;
    speakKoreanAudio(text, { rate: 0.78 });
  };

  const rows = [];
  for (let i = 0; i < HANGUL_LETTERS.length; i += 10) {
    rows.push(HANGUL_LETTERS.slice(i, i + 10));
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 40% 0%, #0b1a3b 0%, #060e22 55%, #02060f 100%)",
      overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "2rem", fontFamily: "'Georgia', serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400&family=IBM+Plex+Mono:ital,wght@0,400;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        @keyframes pulse { 0%,100%{opacity:.2;transform:scaleY(.6)} 50%{opacity:1;transform:scaleY(1)} }
        @keyframes twinkle { 0%,100%{opacity:.1} 50%{opacity:.55} }
        @keyframes correctPop { 0%{transform:scale(1)} 40%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(11,26,59,0.4); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5b8dee 0%, #2a3f6e 100%); border-radius: 10px; border: 1px solid rgba(11,26,59,0.5); }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #7aa6f5 0%, #3d5a9e 100%); }
        ::-webkit-scrollbar-corner { background: transparent; }
        * { scrollbar-width: thin; scrollbar-color: #2a3f6e rgba(11,26,59,0.4); }

        .bar { animation: pulse 1.1s ease-in-out infinite; }
        .bar:nth-child(2){animation-delay:.15s} .bar:nth-child(3){animation-delay:.3s} .bar:nth-child(4){animation-delay:.45s}
        .txa:focus { border-color: #5b8dee !important; box-shadow: 0 0 0 3px rgba(91,141,238,0.1) !important; }
        .btn-main { transition: background .15s, transform .1s; }
        .btn-main:hover:not(:disabled) { background: #5b8dee !important; color: #02060f !important; }
        .btn-main:active:not(:disabled) { transform: scale(.97); }
        .copy-btn { transition: color .15s, border-color .15s, background .15s; }
        .copy-btn:hover { background: rgba(91,141,238,0.08) !important; }
        .toggle-btn { transition: color .15s, border-color .15s, background .15s; }
        .toggle-btn:hover { background: rgba(91,141,238,0.08) !important; }
        .letter-tile { transition: border-color .18s, background .18s, transform .1s; }
        .letter-tile:hover { border-color: #5b8dee !important; background: rgba(91,141,238,0.09) !important; }
        .letter-tile:active { transform: scale(0.91); }
        .star { animation: twinkle 3s ease-in-out infinite; position: fixed; border-radius: 50%; background: #fff; pointer-events: none; }
        .quiz-mode-btn:hover { border-color: #5b8dee !important; background: rgba(91,141,238,0.07) !important; }
        .mc-btn { transition: border-color .15s, background .15s; }
        .mc-btn:hover:not(:disabled) { border-color: #5b8dee !important; background: rgba(91,141,238,0.07) !important; }
        .mc-correct { animation: correctPop 0.35s ease; }
        .mc-wrong { animation: wrongShake 0.4s ease; }
        .result-fade { animation: fadeIn 0.25s ease; }

        .app-container { width: 100%; padding: 2rem; max-width: 640px; }
        @media (min-width: 768px) {
          .app-container { max-width: 900px; padding: 2.5rem; }
        }
        @media (min-width: 1024px) {
          .app-container { max-width: 1100px; padding: 3rem; }
        }
        @media (min-width: 1400px) {
          .app-container { max-width: 1300px; padding: 3rem; }
        }
      `}</style>

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 70 }).map((_, i) => (
          <div key={i} className="star" style={{
            width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1,
            top: `${((i * 73.1) % 100)}%`, left: `${((i * 47.3) % 100)}%`,
            animationDelay: `${(i * 0.43) % 3}s`, animationDuration: `${2.2 + (i % 4) * 0.5}s`,
          }} />
        ))}
      </div>

      <div className="app-container" style={{ position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.25em", color: "#5b8dee", textTransform: "uppercase", marginBottom: 10 }}>
            Language Tool
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 300, color: "#e8eeff", margin: 0, letterSpacing: "0.02em" }}>
            한국어 Translator
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2a3f6e", marginTop: 8, letterSpacing: "0.05em" }}>
            English → Hangul + Romanization
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
            {["translator", "quiz-menu", "memory", "writing", "reading", "music"].map(tab => (
              <button key={tab} onClick={() => setView(tab)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em",
                  padding: "6px 18px", background: "transparent",
                  border: `1px solid ${view === tab || (tab === "quiz-menu" && view === "quiz") || (tab === "memory" && view.startsWith("memory")) ? "#5b8dee" : "#162040"}`,
                  borderRadius: 20,
                  color: view === tab || (tab === "quiz-menu" && view === "quiz") || (tab === "memory" && view.startsWith("memory")) ? "#5b8dee" : "#2a3f6e",
                  cursor: "pointer", textTransform: "uppercase",
                }}>
                {tab === "translator" ? "Translator" : tab === "quiz-menu" ? "Quiz" : tab === "memory" ? "Memory" : tab === "writing" ? "Writing" : tab === "reading" ? "Reading" : "Music"}
              </button>
            ))}
          </div>
        </div>

        {/* ── TRANSLATOR VIEW ── */}
        {view === "translator" && (
          <>
            <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "1rem" }}>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                English
              </label>
              <textarea className="txa" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") translate(); }}
                placeholder="Type a sentence…" rows={3}
                style={{ width: "100%", background: "rgba(2,6,15,0.7)", border: "1px solid #162040", borderRadius: 10, padding: "12px 14px", color: "#e8eeff", fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
                <button className="btn-main" onClick={translate} disabled={loading || !input.trim()}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 24px", background: "transparent", border: "1px solid #5b8dee", borderRadius: 8, color: "#5b8dee", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: !input.trim() ? 0.35 : 1 }}>
                  {loading ? "Translating…" : "Translate →"}
                </button>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#162040" }}>⌘ Enter</span>
              </div>
            </div>

            {(loading || result || error) && (
              <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, overflow: "hidden", marginBottom: "1rem" }}>
                {loading && (
                  <div style={{ padding: "2rem", display: "flex", gap: 5, alignItems: "flex-end", justifyContent: "center", height: 80 }}>
                    {[0,1,2,3].map(i => <div key={i} className="bar" style={{ width: 3, height: 20, background: "#5b8dee", borderRadius: 2 }} />)}
                  </div>
                )}
                {error && <div style={{ padding: "1.5rem", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#e05c6a" }}>{error}</div>}
                {result && (
                  <>
                    <div style={{ padding: "1.5rem 1.5rem 1.25rem" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#5b8dee", textTransform: "uppercase", marginBottom: 12 }}>Hangul</div>
                      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 30, fontWeight: 300, color: "#e8eeff", lineHeight: 1.5 }}>{result.hangul}</div>
                    </div>
                    <div style={{ height: 1, background: "#0e1a35", margin: "0 1.5rem" }} />
                    <div style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 10 }}>Romanized</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontStyle: "italic", color: "#4a6eaa", lineHeight: 1.7 }}>{result.romanized}</div>
                    </div>
                    <div style={{ height: 1, background: "#0e1a35", margin: "0 1.5rem" }} />
                    <div style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#2a3f6e", textTransform: "uppercase" }}>Usage note</div>
                        <button className="toggle-btn" onClick={() => setNoteInEnglish(v => !v)}
                          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: "3px 10px", background: "transparent", border: `1px solid ${noteInEnglish ? "#5b8dee" : "#162040"}`, borderRadius: 5, color: noteInEnglish ? "#5b8dee" : "#2a3f6e", cursor: "pointer" }}>
                          {noteInEnglish ? "KR" : "EN"}
                        </button>
                      </div>
                      <div style={{ fontFamily: noteInEnglish ? "'Cormorant Garamond', serif" : "'Noto Sans KR', sans-serif", fontSize: 15, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.7 }}>
                        {noteInEnglish ? result.notes_english ?? result.notes : result.notes}
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid #0e1a35", padding: "0.85rem 1.5rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[["hangul", "Copy Hangul"], ["romanized", "Copy Romanized"]].map(([key, label]) => (
                        <button key={key} className="copy-btn" onClick={() => copyText(result[key], key)}
                          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "5px 14px", border: `1px solid ${copied === key ? "#4caf7d" : "#162040"}`, borderRadius: 6, background: "transparent", color: copied === key ? "#4caf7d" : "#2a3f6e", cursor: "pointer" }}>
                          {copied === key ? "✓ Copied" : label}
                        </button>
                      ))}
                      <button className="copy-btn" onClick={() => pronounceKorean(result.hangul)}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "5px 14px", border: "1px solid #162040", borderRadius: 6, background: "transparent", color: "#2a3f6e", cursor: "pointer" }}>
                        🔊 Pronounce
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "2rem 0" }}>
              <div style={{ flex: 1, height: 1, background: "#0e1a35" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#1e2e55", textTransform: "uppercase" }}>Hangul alphabet</span>
              <div style={{ flex: 1, height: 1, background: "#0e1a35" }} />
            </div>

            <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#2a3f6e", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                Hover to see romanization. Click to hear pronunciation.
              </p>
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6, marginBottom: 6 }}>
                  {row.map((letter) => {
                    const isHovered = hoveredLetter?.hangul === letter.hangul;
                    return (
                      <div key={letter.hangul} className="letter-tile"
                        onMouseEnter={() => setHoveredLetter(letter)} onMouseLeave={() => setHoveredLetter(null)}
                        onClick={() => pronounceLetter(letter.hangul)}
                        style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2,6,15,0.5)", border: "1px solid #162040", borderRadius: 8, position: "relative", overflow: "hidden", cursor: "pointer" }}>
                        <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 24, color: "#f0f4ff", position: "absolute", transition: "opacity 0.18s, transform 0.18s", opacity: isHovered ? 0 : 1, transform: isHovered ? "scale(0.65)" : "scale(1)" }}>
                          {letter.hangul}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: "bold", color: "#5b8dee", position: "absolute", transition: "opacity 0.18s, transform 0.18s", opacity: isHovered ? 1 : 0, transform: isHovered ? "scale(1)" : "scale(1.2)", letterSpacing: "0.02em" }}>
                          {letter.roman}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ marginTop: 14, height: 44, borderTop: "1px solid #0e1a35", paddingTop: 12, display: "flex", alignItems: "center" }}>
                {hoveredLetter?.note ? (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#5b8dee", lineHeight: 1.6 }}>
                    <span style={{ color: "#2a3f6e", marginRight: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{hoveredLetter.hangul} · {hoveredLetter.roman}</span>
                    {hoveredLetter.note}
                  </span>
                ) : hoveredLetter ? (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#1e2e55" }}>{hoveredLetter.hangul} · {hoveredLetter.roman}</span>
                ) : (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#0e1a35" }}>hover a letter</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── QUIZ MENU VIEW ── */}
        {view === "quiz-menu" && (
          <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
            <QuizModeSelect
              onStart={(mode) => { setQuizMode(mode); setView("quiz"); }}
              onBack={() => setView("translator")}
            />
          </div>
        )}

        {/* ── QUIZ VIEW ── */}
        {view === "quiz" && (
          <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
            <QuizScreen mode={quizMode} onBack={() => setView("quiz-menu")} />
          </div>
        )}

        {/* ── MEMORY GAME VIEW ── */}
        {view.startsWith("memory") && (
          <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
            <MemoryGame onBack={() => setView("translator")} />
          </div>
        )}

        {/* ── WRITING VIEW ── */}
        {view === "writing" && (
          <div style={{ width: "100%", maxWidth: "100%", position: "relative" }}>
            <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
              <DrawingPractice onBack={() => setView("translator")} />
            </div>
          </div>
        )}

        {/* ── READING VIEW ── */}
        {view === "reading" && (
          <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
            <ReadingPractice onBack={() => setView("translator")} />
          </div>
        )}

        {/* ── MUSIC VIEW ── */}
        {view === "music" && (
          <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem" }}>
            <MusicScreen onBack={() => setView("translator")} />
          </div>
        )}

      </div>
    </div>
  );
}