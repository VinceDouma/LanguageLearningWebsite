import { useState, useRef, useEffect, useCallback } from "react";
import { VOCAB_SENTENCES, VOCAB_WORDS, SINO, HANGUL_LETTERS } from "./constants";
import { speakKoreanAudio } from "./audioUtils";

// Extract all Korean words with their translations from quiz data
function getAllKoreanWordsWithTranslations() {
  const wordMap = new Map();
  
  // Add Sino numbers
  SINO.forEach((kr, i) => {
    wordMap.set(kr, String(i + 1));
  });
  
  // Add Hangul letters
  HANGUL_LETTERS.forEach(l => {
    wordMap.set(l.hangul, l.roman);
  });
  
  // Add vocabulary sentences
  Object.values(VOCAB_SENTENCES).forEach(tier => {
    tier.forEach(item => {
      wordMap.set(item.kr, item.en);
    });
  });
  
  // Add vocabulary words
  Object.values(VOCAB_WORDS).forEach(tier => {
    tier.forEach(item => {
      wordMap.set(item.kr, item.en);
    });
  });
  
  return wordMap;
}

export default function DrawingPractice({ onBack }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [currentTranslation, setCurrentTranslation] = useState("");
  const [showTracingLines, setShowTracingLines] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState("words"); // "words" or "sentences"
  const wordMap = useRef(getAllKoreanWordsWithTranslations());

  const getRandomWord = useCallback(() => {
    const words = Array.from(wordMap.current.keys());
    // Filter based on mode
    const filteredWords = words.filter(word => {
      if (mode === "sentences") {
        // Only include sentences (longer strings with spaces)
        return word.length > 3 && (word.includes(" ") || word.length > 5);
      }
      // For words mode, prefer shorter strings
      return word.length <= 8;
    });
    const pool = filteredWords.length > 0 ? filteredWords : words;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }, [mode]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Higher resolution
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 5; // Increased stroke width for easier drawing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    setupCanvas();
    const word = getRandomWord();
    setCurrentWord(word);
    setCurrentTranslation(wordMap.current.get(word) || "");
  }, [getRandomWord, setupCanvas, mode]);

  const startDrawing = (e) => {
    if (isAnimating) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || isAnimating) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = ctxRef.current;
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleNewWord = () => {
    const word = getRandomWord();
    setCurrentWord(word);
    setCurrentTranslation(wordMap.current.get(word) || "");
    clearCanvas();
  };

  const toggleMode = () => {
    setMode(prev => prev === "words" ? "sentences" : "words");
  };

  const toggleTracingLines = () => {
    setShowTracingLines(!showTracingLines);
  };

  const pronounceWord = () => {
    speakKoreanAudio(currentWord, { rate: 0.8 });
  };

  const animateDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    setIsAnimating(true);
    clearCanvas();
    
    // Create a smooth brush-stroke animation
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const fontSize = mode === "sentences" ? 80 : 150;
    ctx.font = `${fontSize}px 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw the text to an offscreen canvas to get the shape
    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.scale(2, 2);
    offCtx.font = `${fontSize}px 'Noto Sans KR', sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#000000';
    offCtx.fillText(currentWord, centerX, centerY);
    
    // Get the bounding box of the text
    const metrics = offCtx.measureText(currentWord);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    // Extract the text region
    const startX = centerX - textWidth / 2 - 20;
    const startY = centerY - textHeight / 2 - 20;
    const endX = centerX + textWidth / 2 + 20;
    const endY = centerY + textHeight / 2 + 20;
    
    const imageData = offCtx.getImageData(startX * 2, startY * 2, (endX - startX) * 2, (endY - startY) * 2);
    const pixels = imageData.data;
    
    // Create stroke paths by scanning the text
    const strokes = [];
    const visited = new Set();
    const width = (endX - startX) * 2;
    const height = (endY - startY) * 2;
    
    // Find connected components to create stroke paths
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 4;
        const key = `${x},${y}`;
        
        if (pixels[idx + 3] > 128 && !visited.has(key)) {
          // Found a new stroke point, trace it
          const stroke = [];
          let currentX = x;
          let currentY = y;
          
          // Simple stroke tracing
          for (let i = 0; i < 20; i++) {
            stroke.push({ x: startX + currentX / 2, y: startY + currentY / 2 });
            visited.add(`${currentX},${currentY}`);
            
            // Move right
            currentX += 4;
            if (currentX >= width) break;
            const nextIdx = (currentY * width + currentX) * 4;
            if (pixels[nextIdx + 3] <= 128) break;
          }
          
          if (stroke.length > 2) {
            strokes.push(stroke);
          }
        }
      }
    }
    
    // Sort strokes left to right, top to bottom
    strokes.sort((a, b) => {
      if (Math.abs(a[0].y - b[0].y) < 20) {
        return a[0].x - b[0].x;
      }
      return a[0].y - b[0].y;
    });
    
    // Animate each stroke
    let strokeIndex = 0;
    let pointIndex = 0;
    
    const animate = () => {
      if (strokeIndex >= strokes.length) {
        setIsAnimating(false);
        // Draw final filled text
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(currentWord, centerX, centerY);
        return;
      }
      
      const currentStroke = strokes[strokeIndex];
      
      if (pointIndex < currentStroke.length) {
        ctx.beginPath();
        const startIdx = Math.max(0, pointIndex - 1);
        ctx.moveTo(currentStroke[startIdx].x, currentStroke[startIdx].y);
        
        // Draw a segment of the stroke
        for (let i = startIdx; i < Math.min(pointIndex + 3, currentStroke.length); i++) {
          ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        }
        ctx.stroke();
        
        pointIndex += 2;
      } else {
        strokeIndex++;
        pointIndex = 0;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "transparent", border: "none", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
          ← back
        </button>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2a3f6e" }}>
          Writing Practice
        </div>
      </div>

      {/* Word Display */}
      <div style={{ background: "rgba(11,26,59,0.7)", border: "1px solid #162040", borderRadius: 16, padding: "28px 20px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.15em", color: "#2a3f6e", textTransform: "uppercase" }}>
            Practice writing
          </div>
          <button onClick={toggleMode}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              padding: "4px 12px",
              border: `1px solid ${mode === "sentences" ? "#5b8dee" : "#162040"}`,
              borderRadius: 12,
              background: mode === "sentences" ? "rgba(91,141,238,0.15)" : "transparent",
              color: mode === "sentences" ? "#5b8dee" : "#2a3f6e",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}>
            {mode === "words" ? "Words" : "Sentences"}
          </button>
        </div>
        <div style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: mode === "sentences" ? 32 : 48,
          fontWeight: 300,
          color: "#e8eeff",
          lineHeight: 1.4,
          marginBottom: 8,
        }}>
          {currentWord}
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: mode === "sentences" ? 14 : 16,
          fontStyle: "italic",
          color: "#5b8dee",
          marginBottom: 14,
        }}>
          {currentTranslation}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleNewWord}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", border: "1px solid #162040", borderRadius: 20, background: "transparent", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
            New {mode === "words" ? "Word" : "Sentence"}
          </button>
          <button onClick={pronounceWord}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", border: "1px solid #162040", borderRadius: 20, background: "transparent", color: "#2a3f6e", cursor: "pointer", letterSpacing: "0.05em" }}>
            🔊 Pronounce
          </button>
          <button onClick={animateDrawing} disabled={isAnimating}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 14px", border: "1px solid #162040", borderRadius: 20, background: isAnimating ? "rgba(91,141,238,0.15)" : "transparent", color: isAnimating ? "#5b8dee" : "#2a3f6e", cursor: isAnimating ? "not-allowed" : "pointer", letterSpacing: "0.05em", opacity: isAnimating ? 0.6 : 1 }}>
            {isAnimating ? "Drawing..." : "✏️ Example"}
          </button>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div style={{ position: "relative", marginBottom: 20, width: "100%" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            width: "100%",
            height: mode === "sentences" ? "500px" : "450px",
            background: "#ffffff",
            border: "2px solid #5b8dee",
            borderRadius: 12,
            cursor: isAnimating ? "wait" : "crosshair",
            touchAction: "none",
          }}
        />
        {/* Tracing Lines Overlay */}
        {showTracingLines && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: mode === "sentences" ? 100 : 180,
              fontWeight: 100,
              color: "rgba(0, 0, 0, 0.08)",
              userSelect: "none",
            }}>
              {currentWord}
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={toggleTracingLines}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            padding: "10px 20px",
            background: showTracingLines ? "rgba(91,141,238,0.15)" : "transparent",
            border: `1px solid ${showTracingLines ? "#5b8dee" : "#162040"}`,
            borderRadius: 8,
            color: showTracingLines ? "#5b8dee" : "#2a3f6e",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}>
          {showTracingLines ? "Hide Guide" : "Show Guide"}
        </button>
        <button onClick={clearCanvas}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            padding: "10px 20px",
            background: "transparent",
            border: "1px solid #162040",
            borderRadius: 8,
            color: "#2a3f6e",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}>
          Clear Drawing
        </button>
      </div>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "#2a3f6e", lineHeight: 1.6 }}>
          Practice writing the Korean characters above. Use "Show Guide" to see faint tracing lines, or "Example" to see an animation. No checking — just practice!
        </p>
      </div>
    </div>
  );
}
