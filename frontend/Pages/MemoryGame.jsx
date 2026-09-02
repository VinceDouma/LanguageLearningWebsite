import { useState, useCallback, useEffect } from "react";
import { VOCAB_WORDS, VOCAB_SENTENCES, QUIZ_MENU_SECTIONS } from "./constants";
import { playCorrectSound, playWrongSound, shuffle, speakKoreanAudio } from "./audioUtils";

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
  return "Memory Game";
}

// ─── Memory Card Game ─────────────────────────────────────────────────────────

export default function MemoryGame({ onBack }) {
  const [stage, setStage] = useState("category-select"); // category-select, difficulty-select, playing, completed
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState(new Set());
  const [matched, setMatched] = useState(new Set());
  const [firstCard, setFirstCard] = useState(null);
  const [secondCard, setSecondCard] = useState(null);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  // Get word count for difficulty
  const getWordCount = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return 4;
      case "medium":
        return 8;
      case "hard":
        return 16; // 12-16 words, we use 16 for consistency
      default:
        return 4;
    }
  };

  // Initialize game with selected difficulty
  const initializeGame = useCallback((mode, difficulty) => {
    const pool = getVocabPoolForMode(mode);
    if (!pool || pool.length === 0) {
      alert("This category has no vocabulary data.");
      return;
    }

    const wordCount = getWordCount(difficulty);
    // Shuffle and pick words
    const selectedWords = shuffle(pool).slice(0, Math.min(wordCount, pool.length));

    // Create card pairs: one with English, one with Korean
    const cardPairs = [];
    selectedWords.forEach((word, idx) => {
      cardPairs.push({
        id: `${idx}-en`,
        pairId: idx,
        type: "english",
        text: word.en,
        language: "en",
      });
      cardPairs.push({
        id: `${idx}-kr`,
        pairId: idx,
        type: "korean",
        text: word.kr,
        language: "kr",
      });
    });

    const shuffledCards = shuffle(cardPairs);
    setCards(shuffledCards);
    setFlipped(new Set());
    setMatched(new Set());
    setFirstCard(null);
    setSecondCard(null);
    setMoves(0);
    setLocked(false);
    setStage("playing");
  }, []);

  const handleSelectDifficulty = (difficulty) => {
    setSelectedDifficulty(difficulty);
    initializeGame(selectedMode, difficulty);
  };

  const handleCardClick = useCallback((cardIndex) => {
    if (locked) return;
    if (flipped.has(cardIndex)) return;
    if (matched.has(cards[cardIndex].pairId)) return;

    const newFlipped = new Set(flipped);
    newFlipped.add(cardIndex);
    setFlipped(newFlipped);

    if (firstCard === null) {
      setFirstCard(cardIndex);
    } else {
      setSecondCard(cardIndex);
      setLocked(true);

      // Check if cards match
      const first = cards[firstCard];
      const second = cards[cardIndex];

      if (first.pairId === second.pairId) {
        // Match found!
        playCorrectSound();
        
        // Get the Korean text for pronunciation
        const koreanCard = first.language === "kr" ? first : second;
        const englishCard = first.language === "en" ? first : second;
        
        // Pronounce the Korean word
        setTimeout(() => {
          speakKoreanAudio(koreanCard.text, { rate: 0.8 });
        }, 300);
        
        const newMatched = new Set(matched);
        newMatched.add(first.pairId);
        setMatched(newMatched);

        setFirstCard(null);
        setSecondCard(null);
        setLocked(false);
        setMoves((m) => m + 1);

        // Check if game is complete
        if (newMatched.size === getWordCount(selectedDifficulty)) {
          setTimeout(() => {
            setStage("completed");
          }, 300);
        }
      } else {
        // No match
        playWrongSound();
        setMoves((m) => m + 1);

        setTimeout(() => {
          setFlipped(new Set());
          setFirstCard(null);
          setSecondCard(null);
          setLocked(false);
        }, 800);
      }
    }
  }, [firstCard, flipped, matched, cards, selectedDifficulty]);

  const handleBackToCategory = () => {
    setStage("category-select");
    setSelectedMode(null);
    setSelectedDifficulty(null);
  };

  const handleBackToDifficulty = () => {
    setStage("difficulty-select");
    setSelectedDifficulty(null);
  };

  const handlePlayAgain = () => {
    handleSelectDifficulty(selectedDifficulty);
  };

  // ─── Category Selection ───
  if (stage === "category-select") {
    return (
      <div>
        <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em", marginBottom: 20 }}>
          ← back
        </button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "#e8eeff", marginBottom: 4 }}>
          Memory game
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2a3f6e", marginBottom: 20 }}>
          Match English words with Korean translations
        </div>

        {QUIZ_MENU_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#1e2e55", textTransform: "uppercase", marginBottom: 10 }}>
              {section.title}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {section.modes.map((m) => {
                const isWordBased = m.id.endsWith("-word") || m.id.endsWith("-sentence");
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isWordBased) {
                        setSelectedMode(m.id);
                        setStage("difficulty-select");
                      }
                    }}
                    disabled={!isWordBased}
                    style={{
                      width: "100%",
                      background: isWordBased ? "rgba(11,26,59,0.7)" : "rgba(11,26,59,0.3)",
                      border: `1px solid ${isWordBased ? "#162040" : "#0a1a35"}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      cursor: isWordBased ? "pointer" : "not-allowed",
                      textAlign: "left",
                      boxSizing: "border-box",
                      opacity: isWordBased ? 1 : 0.5,
                    }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#5b8dee", marginBottom: 4 }}>
                      {m.label}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.4 }}>
                      {m.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Difficulty Selection ───
  if (stage === "difficulty-select") {
    const modeLabel = findQuizModeLabel(selectedMode);
    const difficulties = [
      { id: "easy", label: "Easy", description: "4 words — 8 cards", pairs: 4 },
      { id: "medium", label: "Medium", description: "8 words — 16 cards", pairs: 8 },
      { id: "hard", label: "Hard", description: "16 words — 32 cards", pairs: 16 },
    ];

    return (
      <div>
        <button onClick={handleBackToCategory} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em", marginBottom: 20 }}>
          ← back to categories
        </button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "#e8eeff", marginBottom: 4 }}>
          {modeLabel}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2a3f6e", marginBottom: 20 }}>
          Choose difficulty
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {difficulties.map((diff) => (
            <button
              key={diff.id}
              onClick={() => handleSelectDifficulty(diff.id)}
              style={{
                width: "100%",
                background: "rgba(11,26,59,0.7)",
                border: "1px solid #162040",
                borderRadius: 12,
                padding: "18px 20px",
                cursor: "pointer",
                textAlign: "left",
                boxSizing: "border-box",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#5b8dee";
                e.target.style.background = "rgba(91,141,238,0.08)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#162040";
                e.target.style.background = "rgba(11,26,59,0.7)";
              }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: "bold", color: "#5b8dee", marginBottom: 6 }}>
                {diff.label}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: "italic", color: "#2a3f6e" }}>
                {diff.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Game Board ───
  if (stage === "playing") {
    const matchedCount = matched.size;
    const totalPairs = getWordCount(selectedDifficulty);
    const modeLabel = findQuizModeLabel(selectedMode);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <button onClick={handleBackToDifficulty} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
              ← change difficulty
            </button>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: "#e8eeff", marginTop: 8 }}>
              {modeLabel}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e", marginBottom: 6 }}>
              Matched
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: "bold", color: "#5b8dee" }}>
              {matchedCount} / {totalPairs}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e", marginTop: 8 }}>
              Moves: {moves}
            </div>
          </div>
        </div>

        {/* Card Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              cards.length <= 8 ? "repeat(auto-fit, minmax(100px, 1fr))" : "repeat(auto-fit, minmax(90px, 1fr))",
            gap: 12,
            marginBottom: 24,
            maxWidth: "100%",
          }}>
          {cards.map((card, idx) => {
            const isFlipped = flipped.has(idx);
            const isMatched = matched.has(card.pairId);

            return (
              <button
                key={idx}
                onClick={() => handleCardClick(idx)}
                disabled={isMatched || locked}
                style={{
                  aspectRatio: "1",
                  background: isMatched ? "rgba(76,175,125,0.15)" : isFlipped ? "rgba(91,141,238,0.15)" : "rgba(11,26,59,0.7)",
                  border: `2px solid ${isMatched ? "#4caf7d" : isFlipped ? "#5b8dee" : "#162040"}`,
                  borderRadius: 12,
                  cursor: isMatched || locked ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  transition: "border-color 0.15s, background 0.15s, transform 0.1s",
                  transform: isFlipped ? "scale(0.98)" : "scale(1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (!isMatched && !locked) {
                    e.target.style.borderColor = "#5b8dee";
                    e.target.style.background = "rgba(91,141,238,0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMatched && !locked) {
                    e.target.style.borderColor = "#162040";
                    e.target.style.background = "rgba(11,26,59,0.7)";
                  }
                }}>
                <div
                  style={{
                    fontFamily: card.language === "kr" ? "'Noto Sans KR', sans-serif" : "'Cormorant Garamond', serif",
                    fontSize: card.language === "kr" ? 20 : 14,
                    fontWeight: card.language === "kr" ? 400 : 300,
                    fontStyle: card.language === "kr" ? "normal" : "italic",
                    color: isMatched ? "#4caf7d" : isFlipped ? "#e8eeff" : "#2a3f6e",
                    textAlign: "center",
                    lineHeight: 1.4,
                    opacity: isFlipped || isMatched ? 1 : 0,
                    transition: "opacity 0.2s",
                    pointerEvents: "none",
                  }}>
                  {card.text}
                </div>
                <div
                  style={{
                    position: "absolute",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 20,
                    color: "#5b8dee",
                    opacity: !isFlipped && !isMatched ? 1 : 0,
                    transition: "opacity 0.2s",
                    pointerEvents: "none",
                  }}>
                  ?
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Completion Screen ───
  if (stage === "completed") {
    const totalPairs = getWordCount(selectedDifficulty);
    const modeLabel = findQuizModeLabel(selectedMode);

    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "#e8eeff", marginBottom: 8 }}>
          You completed the game!
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#2a3f6e", marginBottom: 24 }}>
          {modeLabel} — {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
        </div>

        <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e", marginBottom: 8 }}>
                Pairs matched
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: "bold", color: "#4caf7d" }}>
                {totalPairs}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2a3f6e", marginBottom: 8 }}>
                Total moves
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: "bold", color: "#5b8dee" }}>
                {moves}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
          <button
            onClick={handlePlayAgain}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.06em",
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid #5b8dee",
              borderRadius: 8,
              color: "#5b8dee",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(91,141,238,0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
            }}>
            Play again
          </button>
          <button
            onClick={handleBackToCategory}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.06em",
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid #162040",
              borderRadius: 8,
              color: "#2a3f6e",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#5b8dee";
              e.target.style.background = "rgba(91,141,238,0.08)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#162040";
              e.target.style.background = "transparent";
            }}>
            Choose another category
          </button>
          <button
            onClick={onBack}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.06em",
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid #162040",
              borderRadius: 8,
              color: "#2a3f6e",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#5b8dee";
              e.target.style.background = "rgba(91,141,238,0.08)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#162040";
              e.target.style.background = "transparent";
            }}>
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
