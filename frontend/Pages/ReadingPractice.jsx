import { useState, useCallback, useEffect } from "react";

export default function ReadingPractice({ onBack }) {
  const [paragraph, setParagraph] = useState(null);
  const [userRomanization, setUserRomanization] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!startTime || completed) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [startTime, completed]);

  const generateParagraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    setParagraph(null);
    setUserRomanization("");
    setStartTime(null);
    setElapsedTime(0);
    setCompleted(false);
    setFeedback(null);
    setShowComparison(false);

    try {
      const res = await fetch("http://localhost:8000/api/sentence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Generate a short paragraph (3-4 sentences) about everyday Korean life, hobbies, or culture. Return JSON with: {\"korean\": \"...\", \"english\": \"...\", \"romanized\": \"...\"}",
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate paragraph");
      if (!data.korean || !data.romanized) throw new Error("Invalid response format");

      setParagraph(data);
      setStartTime(Date.now());
    } catch (err) {
      setError(err.message || "Failed to generate paragraph. Please try again.");
    }
    setLoading(false);
  }, []);

  const submitRomanization = useCallback(async () => {
    if (!paragraph || !userRomanization.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/api/sentence/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          korean: paragraph.korean,
          english: paragraph.english,
          userAnswer: userRomanization,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Evaluation failed");

      setCompleted(true);
      setFeedback({
        score: data.score,
        comment: data.comment,
      });
    } catch (err) {
      setError(err.message || "Evaluation failed. Please try again.");
    }
  }, [paragraph, userRomanization]);

  const calculateWPM = () => {
    if (elapsedTime === 0) return 0;
    const words = paragraph.romanized.split(/\s+/).length;
    const minutes = elapsedTime / 60;
    return Math.round((words / minutes) * 10) / 10;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "#e8eeff", margin: 0 }}>
          Reading Practice
        </h2>
        <button onClick={onBack} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", background: "transparent",
          border: "1px solid #162040", borderRadius: 6, color: "#2a3f6e", cursor: "pointer",
        }}>
          ← Back
        </button>
      </div>

      {!paragraph && !loading && !error && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "#2a3f6e", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Generate a Korean paragraph and romanize it as fast as possible to improve your reading speed.
          </p>
          <button className="btn-main" onClick={generateParagraph}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "12px 28px", background: "transparent", border: "1px solid #5b8dee", borderRadius: 8, color: "#5b8dee", cursor: "pointer",
            }}>
            Generate Paragraph →
          </button>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end", justifyContent: "center", height: 80 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bar" style={{ width: 3, height: 20, background: "#5b8dee", borderRadius: 2 }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: "1.5rem", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#e05c6a", background: "rgba(224, 92, 106, 0.1)", border: "1px solid #3a2a2a", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {paragraph && !completed && (
        <div>
          {/* Timer and Stats */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", padding: "1rem", background: "rgba(91, 141, 238, 0.05)", border: "1px solid #162040", borderRadius: 8 }}>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "#2a3f6e", textTransform: "uppercase" }}>Elapsed Time</span>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: "bold", color: "#5b8dee" }}>
                {formatTime(elapsedTime)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "#2a3f6e", textTransform: "uppercase" }}>Reading Speed (WPM)</span>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: "bold", color: "#5b8dee" }}>
                {calculateWPM()}
              </div>
            </div>
          </div>

          {/* Korean Paragraph */}
          <div style={{ background: "rgba(2, 6, 15, 0.5)", border: "1px solid #162040", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
              Korean Paragraph
            </label>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 22, fontWeight: 300, color: "#e8eeff", lineHeight: 1.8, minHeight: 60 }}>
              {paragraph.korean}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #0e1a35" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 6 }}>
                English Translation
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.6 }}>
                {paragraph.english}
              </div>
            </div>
          </div>

          {/* Romanization Input */}
          <div style={{ background: "rgba(2, 6, 15, 0.5)", border: "1px solid #162040", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Your Romanization
            </label>
            <textarea className="txa" value={userRomanization} onChange={e => setUserRomanization(e.target.value)}
              placeholder="Type the romanization of the Korean paragraph…" rows={4}
              style={{
                width: "100%", background: "rgba(2, 6, 15, 0.7)", border: "1px solid #162040", borderRadius: 10, padding: "12px 14px", color: "#e8eeff", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box",
              }} />
            <div style={{ marginTop: "1rem", display: "flex", gap: 10 }}>
              <button className="btn-main" onClick={submitRomanization} disabled={!userRomanization.trim()}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 24px", background: "transparent", border: "1px solid #5b8dee", borderRadius: 8, color: "#5b8dee", cursor: userRomanization.trim() ? "pointer" : "not-allowed", opacity: userRomanization.trim() ? 1 : 0.35,
                }}>
                Submit →
              </button>
              <button onClick={generateParagraph}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 24px", background: "transparent", border: "1px solid #162040", borderRadius: 8, color: "#2a3f6e", cursor: "pointer",
                }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {completed && feedback && (
        <div style={{ background: "rgba(11, 26, 59, 0.7)", border: "1px solid #162040", borderRadius: 12, overflow: "hidden" }}>
          {/* Results Header */}
          <div style={{ padding: "1.5rem", textAlign: "center", borderBottom: "1px solid #0e1a35" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 10 }}>
              Your Results
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: "bold", color: feedback.score >= 4 ? "#4caf7d" : feedback.score >= 3 ? "#5b8dee" : "#e05c6a" }}>
                  {feedback.score}/5
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2a3f6e", marginTop: 6 }}>Score</div>
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: "bold", color: "#5b8dee" }}>
                  {formatTime(elapsedTime)}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2a3f6e", marginTop: 6 }}>Time</div>
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: "bold", color: "#5b8dee" }}>
                  {calculateWPM()}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2a3f6e", marginTop: 6 }}>WPM</div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #0e1a35" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.6 }}>
              {feedback.comment}
            </div>
          </div>

          {/* Comparison Toggle */}
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #0e1a35", display: "flex", justifyContent: "center" }}>
            <button onClick={() => setShowComparison(!showComparison)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", background: "transparent", border: `1px solid ${showComparison ? "#5b8dee" : "#162040"}`, borderRadius: 6, color: showComparison ? "#5b8dee" : "#2a3f6e", cursor: "pointer",
              }}>
              {showComparison ? "Hide Comparison" : "Show Comparison"}
            </button>
          </div>

          {/* Comparison */}
          {showComparison && (
            <>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid #0e1a35" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 10 }}>
                  Correct Romanization
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#4caf7d", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {paragraph.romanized}
                </div>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase", marginBottom: 10 }}>
                  Your Romanization
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#e8eeff", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {userRomanization}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ borderTop: "1px solid #0e1a35", padding: "1.5rem", display: "flex", gap: 10 }}>
            <button className="btn-main" onClick={generateParagraph}
              style={{
                flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 24px", background: "transparent", border: "1px solid #5b8dee", borderRadius: 8, color: "#5b8dee", cursor: "pointer",
              }}>
              Try Another →
            </button>
            <button onClick={onBack}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", padding: "10px 24px", background: "transparent", border: "1px solid #162040", borderRadius: 8, color: "#2a3f6e", cursor: "pointer",
              }}>
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
