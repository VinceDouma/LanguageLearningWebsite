import { useState, useRef } from "react";
import { PIANO_KEYS, CORE_KEYS } from "./constants";

export default function MusicScreen({ onBack }) {
  const [mode, setMode] = useState("full");
  const [targetIdx, setTargetIdx] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [statusText, setStatusText] = useState("Press play to hear a random key.");
  const audioCtxRef = useRef(null);
  const activeKeys = mode === "core" ? CORE_KEYS : PIANO_KEYS;

  const playFrequency = (frequency) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.82);
  };

  const playRandomKey = () => {
    const randomIdx = Math.floor(Math.random() * activeKeys.length);
    setTargetIdx(activeKeys[randomIdx].idx);
    setSelectedIdx(null);
    setFeedback(null);
    setStatusText("Listen, then click the exact key.");
    playFrequency(activeKeys[randomIdx].frequency);
  };

  const replayCurrentKey = () => {
    if (targetIdx === null) return;
    playFrequency(PIANO_KEYS[targetIdx].frequency);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setTargetIdx(null);
    setSelectedIdx(null);
    setFeedback(null);
    setStatusText("Press play to hear a random key.");
  };

  const handlePlayButton = () => {
    if (targetIdx !== null && selectedIdx === null) { replayCurrentKey(); return; }
    playRandomKey();
  };

  const guessKey = (idx) => {
    if (targetIdx === null) return;
    playFrequency(PIANO_KEYS[idx].frequency);
    setSelectedIdx(idx);
    const targetPos = activeKeys.findIndex((k) => k.idx === targetIdx);
    const guessPos = activeKeys.findIndex((k) => k.idx === idx);
    if (targetPos < 0 || guessPos < 0) return;
    const distance = Math.abs(guessPos - targetPos);
    if (distance === 0) {
      setFeedback("correct");
      setStatusText(`Correct! It was ${PIANO_KEYS[targetIdx].name}.`);
      setStreak((s) => s + 1);
    } else if (distance <= 2) {
      setFeedback("close");
      setStatusText(`Close! You were within 2 keys of ${PIANO_KEYS[targetIdx].name}.`);
      setStreak((s) => s + 1);
    } else {
      setFeedback("wrong");
      setStatusText(`Not quite. The key was ${PIANO_KEYS[targetIdx].name}.`);
      setStreak(0);
    }
  };

  const keyStyle = (keyIdx, isBlack) => {
    if (selectedIdx !== keyIdx) {
      return {
        background: isBlack ? "rgba(2,6,15,0.9)" : "rgba(232,238,255,0.92)",
        color: isBlack ? "#9fb3dd" : "#1f2d4f",
        border: "1px solid #162040",
      };
    }
    if (feedback === "correct") return { background: "rgba(76,175,125,0.22)", color: "#4caf7d", border: "1px solid #4caf7d" };
    if (feedback === "close") return { background: "rgba(255,165,0,0.22)", color: "#ffb13b", border: "1px solid #ff9a2f" };
    return { background: "rgba(224,92,106,0.2)", color: "#e05c6a", border: "1px solid #e05c6a" };
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
          ← back
        </button>
        <div style={{ background: "rgba(255,180,0,0.12)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 20, padding: "4px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#d4a017" }}>
          🔥 {streak} streak
        </div>
      </div>

      <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "#e8eeff", marginBottom: 8 }}>Piano ear training</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e", marginBottom: 14 }}>Start with core notes, then level up to all 88 keys.</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[{ id: "core", label: "Core notes" }, { id: "full", label: "Full 88 keys" }].map((m) => (
            <button key={m.id} onClick={() => switchMode(m.id)}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", padding: "6px 14px", background: "transparent", border: `1px solid ${mode === m.id ? "#5b8dee" : "#162040"}`, borderRadius: 20, color: mode === m.id ? "#5b8dee" : "#2a3f6e", cursor: "pointer" }}>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={handlePlayButton}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 22px", background: "transparent", border: "1px solid #5b8dee", borderRadius: 8, color: "#5b8dee", cursor: "pointer", marginBottom: 12 }}>
          {targetIdx !== null && selectedIdx === null ? "▶ Play key again" : "▶ Play random key"}
        </button>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: feedback === "correct" ? "#4caf7d" : feedback === "close" ? "#ffb13b" : feedback === "wrong" ? "#e05c6a" : "#8fa7d8" }}>
          {statusText}
        </div>
      </div>

      <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${activeKeys.length}, minmax(36px, 1fr))`, gap: 4, minWidth: mode === "core" ? 500 : 3300 }}>
            {activeKeys.map((key) => {
              const style = keyStyle(key.idx, key.isBlack);
              return (
                <button key={key.midi} onClick={() => guessKey(key.idx)}
                  style={{ height: key.isBlack ? 90 : 120, borderRadius: 6, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.02em", ...style }}>
                  {key.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
