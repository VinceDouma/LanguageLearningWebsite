import { useState, useCallback } from "react";
import { SINO, HANGUL_LETTERS, QUIZ_LETTERS, QUIZ_MENU_SECTIONS, LETTER_PRONUNCIATION, VOCAB_SENTENCES, VOCAB_WORDS } from "./constants";
import { playCorrectSound, playWrongSound, speakKoreanAudio, shuffle } from "./audioUtils";

function getVocabPoolForMode(mode) {
  if (mode === "numbers" || mode === "letters") return null;
  if (mode.endsWith("-sentence")) {
    const tier = mode.slice(0, -"-sentence".length);
    return VOCAB_SENTENCES[tier] ?? null;
  }
  if (mode.endsWith("-word")) {
    const tier = mode.slice(0, -"-word".length);
    return VOCAB_WORDS[tier] ?? null;
  }
  return null;
}

function findQuizModeLabel(modeId) {
  for (const section of QUIZ_MENU_SECTIONS) {
    const found = section.modes.find((m) => m.id === modeId);
    if (found) return found.label;
  }
  return "Answer sheet";
}

function getQuizStudyRows(modeId) {
  if (modeId === "numbers") {
    return SINO.map((kr, i) => ({ hint: String(i + 1), answer: kr }));
  }
  if (modeId === "letters") {
    return HANGUL_LETTERS.map(({ hangul, roman }) => ({ hint: roman, answer: hangul }));
  }
  const pool = getVocabPoolForMode(modeId);
  if (!pool) return [];
  return pool.map(({ en, kr }) => ({ hint: en, answer: kr }));
}

export function QuizScreen({ mode, onBack }) {
  const [streak, setStreak] = useState(0);
  const [numberStep, setNumberStep] = useState(1);
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [correctIdx, setCorrectIdx] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [locked, setLocked] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [animClass, setAnimClass] = useState("");

  const buildQuestion = useCallback((step) => {
    if (mode === "numbers") {
      const kr = SINO[step - 1];
      return { display: String(step), answer: kr, pool: SINO };
    } else if (mode === "letters") {
      const item = QUIZ_LETTERS[Math.floor(Math.random() * QUIZ_LETTERS.length)];
      return { display: item.display, answer: item.answer, pool: item.pool };
    } else {
      const pool = getVocabPoolForMode(mode);
      if (!pool || pool.length === 0) {
        return { display: "", answer: "", pool: [] };
      }
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { display: item.en, answer: item.kr, pool: pool.map((v) => v.kr) };
    }
  }, [mode]);

  const loadQuestion = useCallback((step) => {
    const q = buildQuestion(step);
    setQuestion(q);
    setSelected(null);
    setResult(null);
    setLocked(false);
    setCorrectAnswer("");
    setAnimClass("");
    const distractors = shuffle(q.pool.filter(x => x !== q.answer)).slice(0, 3);
    const opts = shuffle([q.answer, ...distractors]);
    setOptions(opts);
    setCorrectIdx(opts.indexOf(q.answer));
  }, [buildQuestion]);

  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    setTimeout(() => loadQuestion(1), 0);
  }

  const handleMC = (idx) => {
    if (locked || !question) return;
    setLocked(true);
    setSelected(idx);
    const correct = idx === correctIdx;
    setCorrectAnswer(question.answer);

    if (correct) {
      playCorrectSound();
      setResult("correct");
      setStreak(s => s + 1);
      setAnimClass("correct");
      setTimeout(() => {
        const textToSpeak = mode === "letters"
          ? (LETTER_PRONUNCIATION[question.answer] ?? question.answer)
          : question.answer;
        speakKoreanAudio(textToSpeak, { rate: 0.8 });
      }, 300);
      const nextStep = mode === "numbers" ? numberStep + 1 : numberStep;
      if (mode === "numbers") setNumberStep(nextStep);
      setTimeout(() => loadQuestion(nextStep), 1600);
    } else {
      playWrongSound();
      setResult("wrong");
      setAnimClass("wrong");
      setStreak(0);
    }
  };

  const handleRestart = () => {
    setStreak(0);
    setNumberStep(1);
    loadQuestion(1);
  };

  const promptLabel = mode === "numbers"
    ? "What is this number in Korean?"
    : mode === "letters"
    ? "Which Hangul symbol makes this sound?"
    : mode.endsWith("-word")
    ? "How do you write this in Korean?"
    : "How do you say this in Korean?";

  const pronounceQuizPrompt = () => {
    if (!question) return;
    const textToSpeak = mode === "letters"
      ? (LETTER_PRONUNCIATION[question.answer] ?? question.answer)
      : question.answer;
    speakKoreanAudio(textToSpeak, { rate: 0.8 });
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
          ← quit
        </button>
        <div style={{ background: "rgba(255,180,0,0.12)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 20, padding: "4px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#d4a017" }}>
          🔥 {streak} streak
        </div>
      </div>

      <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "28px 20px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 12 }}>
          {promptLabel}
        </div>
        <div style={{
          fontFamily: mode === "letters" ? "'IBM Plex Mono', monospace" : "'Cormorant Garamond', serif",
          fontSize: mode === "letters" ? 52 : 36,
          fontWeight: mode === "letters" ? 400 : 300,
          fontStyle: mode === "letters" ? "italic" : "italic",
          color: "#e8eeff", lineHeight: 1.4,
          padding: "0 1rem",
        }}>
          {question?.display ?? ""}
        </div>
        <button onClick={pronounceQuizPrompt}
          style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", border: "1px solid #162040", borderRadius: 20, background: "transparent", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
          🔊 Pronounce answer
        </button>
      </div>

      {options.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {options.map((opt, i) => {
            let borderColor = "#162040";
            let bg = "rgba(11,26,59,0.7)";
            let color = "#e8eeff";
            if (locked) {
              if (i === correctIdx) { borderColor = "#4caf7d"; bg = "rgba(76,175,125,0.1)"; color = "#4caf7d"; }
              else if (i === selected && selected !== correctIdx) { borderColor = "#e05c6a"; bg = "rgba(224,92,106,0.1)"; color = "#e05c6a"; }
            }
            return (
              <button key={i} onClick={() => handleMC(i)} disabled={locked}
                style={{ width: "100%", background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "14px 18px", cursor: locked ? "default" : "pointer", fontFamily: "'Noto Sans KR', sans-serif", fontSize: 18, color, transition: "border-color 0.15s, background 0.15s", lineHeight: 1.5, textAlign: "center" }}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: result === "correct" ? "rgba(76,175,125,0.1)" : "rgba(224,92,106,0.1)", border: `1px solid ${result === "correct" ? "#4caf7d" : "#e05c6a"}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: result === "correct" ? "#4caf7d" : "#e05c6a" }}>
          {result === "correct" ? "✓ Correct! Pronouncing now…" : `✗ Wrong. The answer was: ${correctAnswer}`}
        </div>
      )}

      {result === "wrong" && (
        <div style={{ textAlign: "center", marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handleRestart} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.06em", padding: "10px 22px", background: "transparent", border: "1px solid #2a3f6e", borderRadius: 8, color: "#2a3f6e", cursor: "pointer" }}>
            Try again
          </button>
          <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.06em", padding: "10px 22px", background: "transparent", border: "1px solid #2a3f6e", borderRadius: 8, color: "#2a3f6e", cursor: "pointer" }}>
            Change category
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizModeSelect({ onStart, onBack }) {
  const [studySheetId, setStudySheetId] = useState(null);
  const [hintId, setHintId] = useState(null);

  const studyRows = studySheetId ? getQuizStudyRows(studySheetId) : [];
  const studyTitle = findQuizModeLabel(studySheetId);

  return (
    <div style={{ width: "100%" }}>
      <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em", marginBottom: 20 }}>
        ← back to translator
      </button>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "#e8eeff", marginBottom: 4 }}>
        Korean quiz
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2a3f6e", marginBottom: 20 }}>
        Choose a category
      </div>

      {QUIZ_MENU_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#1e2e55", textTransform: "uppercase", marginBottom: 10 }}>
            {section.title}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {section.modes.map((m) => (
              <div key={m.id} style={{ position: "relative", borderRadius: 12 }}>
                <button type="button" onClick={() => onStart(m.id)}
                  style={{ width: "100%", background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 12, padding: "14px 40px 14px 16px", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#5b8dee", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.4 }}>{m.sub}</div>
                </button>
                {m.id !== "numbers" && (
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <button
                      type="button"
                      aria-label="Open answer sheet"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStudySheetId(m.id); }}
                      onMouseEnter={() => setHintId(m.id)}
                      onMouseLeave={() => setHintId(null)}
                      style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #162040", background: "rgba(2,6,15,0.85)", color: "#5b8dee", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: "bold", lineHeight: 1, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      ?
                    </button>
                    {hintId === m.id && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, width: 220, padding: "10px 12px", borderRadius: 10, border: "1px solid #162040", background: "rgba(11,26,59,0.95)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8fa7d8", lineHeight: 1.5, letterSpacing: "0.03em", zIndex: 5, pointerEvents: "none" }}>
                        Answer sheet: opens every correct pairing so you can study before the quiz.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {studySheetId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setStudySheetId(null)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(2,6,15,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "rgba(11,26,59,0.96)", border: "1px solid #162040", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #0e1a35", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#e8eeff", marginBottom: 4 }}>{studyTitle}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e" }}>Answer sheet · study before you start</div>
              </div>
              <button type="button" onClick={() => setStudySheetId(null)}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "1px solid #162040", background: "transparent", color: "#2a3f6e", cursor: "pointer", flexShrink: 0 }}>
                Close
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "1rem 1.25rem 1.25rem", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {studyRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 10, border: "1px solid #162040", background: "rgba(2,6,15,0.45)" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#b8c8ea", flex: 1, minWidth: 0 }}>
                      {row.hint}
                    </div>
                    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 16, color: "#e8eeff", flexShrink: 0, textAlign: "center", minWidth: 100 }}>
                      {row.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
