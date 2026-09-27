/**
 * Smart Agriculture Assistant — 3-Minute Hackathon Demo Player Engine
 * Orchestrates 180-second cinematic demo, voiceover narration, live backend queries,
 * synchronized subtitles, chapter navigation, and video controls.
 */

const DEMO_CHAPTERS = [
  {
    id: 0,
    startTime: 0,
    endTime: 10,
    title: "01. Introduction",
    name: "AI-Powered Decision Support",
    narration: "Welcome to Smart Agriculture Assistant — an enterprise-grade AI decision support platform built with Machine Learning, FastAPI, and PostgreSQL to empower Indian farmers.",
    badge: "0:00 – 0:10 · Opening",
    endpoint: "GET /api/status",
    type: "intro"
  },
  {
    id: 1,
    startTime: 10,
    endTime: 20,
    title: "02. The Problem",
    name: "Fragmented Decision Silos",
    narration: "Modern farming requires critical decisions across Soil, Crops, Fertilizers, Diseases, and Markets. Until now, these were isolated silos. Our platform unifies them into one continuous intelligent journey.",
    badge: "0:10 – 0:20 · Lifecycle Flow",
    endpoint: "Farmer → Soil → Crop → Fertilizer → Disease → Market",
    type: "problem"
  },
  {
    id: 2,
    startTime: 20,
    endTime: 42,
    title: "03. Soil Report OCR",
    name: "Automated Document Extraction",
    narration: "The journey begins with soil testing. Farmers simply upload their physical lab report. Our OCR engine accurately extracts Nitrogen, Phosphorus, Potassium, pH, and Moisture into structured digital data.",
    badge: "0:20 – 0:42 · OCR Engine",
    endpoint: "POST /soil/upload",
    type: "soil"
  },
  {
    id: 3,
    startTime: 42,
    endTime: 65,
    title: "04. Crop Recommendation",
    name: "Multi-Factor ML Advisory",
    narration: "Next, our trained Machine Learning classifier processes the soil chemistry alongside live agro-climatic weather data to recommend the optimal high-yield crop — in this case, Rice with live weather tracking.",
    badge: "0:42 – 1:05 · ML Classifier",
    endpoint: "POST /predict",
    type: "crop"
  },
  {
    id: 4,
    startTime: 65,
    endTime: 86,
    title: "05. Fertilizer Guidance",
    name: "Precision NPK Nutrition",
    narration: "To nourish the crop, our fertilizer recommendation model analyzes soil type, target crop, and nutrient deficiencies to output exact fertilizer types like Urea, tailored to regional humidity and temperature.",
    badge: "1:05 – 1:26 · Decision Tree ML",
    endpoint: "POST /fertilizer/predict",
    type: "fertilizer"
  },
  {
    id: 5,
    startTime: 86,
    endTime: 108,
    title: "06. Disease Detection",
    name: "Computer Vision Diagnosis",
    narration: "When crop health is compromised, farmers snap a photo of the affected leaf. Our deep learning computer vision model identifies Early Blight with confidence scores and provides actionable fungicide treatments.",
    badge: "1:26 – 1:48 · PyTorch MobileNetV2",
    endpoint: "POST /disease/detect",
    type: "disease"
  },
  {
    id: 6,
    startTime: 108,
    endTime: 132,
    title: "07. Market Intelligence",
    name: "Live Mandi & Price Forecasts",
    narration: "Finally, market intelligence connects farmers to over 8,400 daily Mandi price records across India, providing historical price trends, nearby price comparisons, demand indicators, and predictive sell signals.",
    badge: "1:48 – 2:12 · Mandi Analytics",
    endpoint: "POST /market/price & /market/trend",
    type: "market"
  },
  {
    id: 7,
    startTime: 132,
    endTime: 150,
    title: "08. Agriculture News",
    name: "Real-Time Mandi & MSP News",
    narration: "Farmers stay ahead of government MSP policies, welfare subsidies, and export regulations through real-time categorized agricultural news aggregation.",
    badge: "2:12 – 2:30 · Live RSS Feeds",
    endpoint: "GET /news/latest & /news/dashboard",
    type: "news"
  },
  {
    id: 8,
    startTime: 150,
    endTime: 165,
    title: "09. System Architecture",
    name: "Production Full-Stack Pipeline",
    narration: "Under the hood, a fast asynchronous FastAPI backend coordinates Scikit-learn, PyTorch, and EasyOCR models with PostgreSQL cloud persistence and live REST data streams.",
    badge: "2:30 – 2:45 · Tech Architecture",
    endpoint: "FastAPI + ML + PostgreSQL + REST APIs",
    type: "architecture"
  },
  {
    id: 9,
    startTime: 165,
    endTime: 180,
    title: "10. Closing & Impact",
    name: "From Soil to Market",
    narration: "From soil health to final market sales — Smart Agriculture Assistant delivers one unified, intelligent platform for better agricultural decisions and prosperous farming.",
    badge: "2:45 – 3:00 · Conclusion",
    endpoint: "Production Ready",
    type: "outro"
  }
];

class DemoPlayer {
  constructor() {
    this.totalDuration = 180; // 3 minutes = 180 seconds
    this.currentTime = 0;
    this.isPlaying = false;
    this.playbackRate = 1.0;
    this.activeChapterIndex = 0;
    this.timerInterval = null;
    this.speechEnabled = true;
    this.lastSpokenChapter = -1;

    this.initElements();
    this.initAudioContext();
    this.initEventListeners();
    this.renderChapterTicks();
    this.renderChapterNav();
    this.updateScene(0);
  }

  initElements() {
    this.screenStage = document.getElementById("demoScreenStage");
    this.progressBar = document.getElementById("scrubberProgressFill");
    this.scrubberTrack = document.getElementById("scrubberTrack");
    this.playBtn = document.getElementById("playBtn");
    this.playIcon = document.getElementById("playIcon");
    this.timeDisplay = document.getElementById("timeDisplay");
    this.chapterNameDisplay = document.getElementById("chapterNameDisplay");
    this.captionText = document.getElementById("captionText");
    this.chapterNavContainer = document.getElementById("chapterNavContainer");
    this.speedBtn = document.getElementById("speedBtn");
    this.voiceToggleBtn = document.getElementById("voiceToggleBtn");
  }

  initAudioContext() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }
  }

  playChime() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.5);
    } catch (e) {
      // Ignore audio failure
    }
  }

  initEventListeners() {
    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => this.togglePlay());
    }

    if (this.scrubberTrack) {
      this.scrubberTrack.addEventListener("click", (e) => {
        const rect = this.scrubberTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        this.seekTo(percent * this.totalDuration);
      });
    }

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (prevBtn) prevBtn.addEventListener("click", () => this.prevChapter());
    if (nextBtn) nextBtn.addEventListener("click", () => this.nextChapter());

    if (this.speedBtn) {
      this.speedBtn.addEventListener("click", () => {
        if (this.playbackRate === 1.0) this.playbackRate = 1.25;
        else if (this.playbackRate === 1.25) this.playbackRate = 1.5;
        else this.playbackRate = 1.0;
        this.speedBtn.textContent = `${this.playbackRate}x`;
      });
    }

    if (this.voiceToggleBtn) {
      this.voiceToggleBtn.addEventListener("click", () => {
        this.speechEnabled = !this.speechEnabled;
        this.voiceToggleBtn.style.color = this.speechEnabled ? "var(--primary)" : "var(--text-muted)";
        if (!this.speechEnabled && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === "ArrowRight") {
        this.seekTo(this.currentTime + 5);
      } else if (e.code === "ArrowLeft") {
        this.seekTo(this.currentTime - 5);
      }
    });
  }

  renderChapterTicks() {
    const container = document.getElementById("chapterTicksContainer");
    if (!container) return;
    container.innerHTML = "";
    DEMO_CHAPTERS.forEach(ch => {
      const tick = document.createElement("div");
      tick.className = "chapter-tick";
      tick.style.left = `${(ch.startTime / this.totalDuration) * 100}%`;
      container.appendChild(tick);
    });
  }

  renderChapterNav() {
    if (!this.chapterNavContainer) return;
    this.chapterNavContainer.innerHTML = "";
    DEMO_CHAPTERS.forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.className = `chapter-pill-btn ${idx === 0 ? "active" : ""}`;
      btn.id = `navPill_${idx}`;
      btn.textContent = ch.title;
      btn.addEventListener("click", () => this.jumpToChapter(idx));
      this.chapterNavContainer.appendChild(btn);
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.currentTime >= this.totalDuration) {
      this.currentTime = 0;
    }
    this.isPlaying = true;
    if (this.playIcon) this.playIcon.textContent = "pause";
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.startTimer();
    this.speakCurrentChapter();
  }

  pause() {
    this.isPlaying = false;
    if (this.playIcon) this.playIcon.textContent = "play_arrow";
    this.stopTimer();
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  startTimer() {
    this.stopTimer();
    const tickMs = 100;
    this.timerInterval = setInterval(() => {
      this.currentTime += (tickMs / 1000) * this.playbackRate;
      if (this.currentTime >= this.totalDuration) {
        this.currentTime = this.totalDuration;
        this.pause();
      }
      this.updatePlayerState();
    }, tickMs);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  seekTo(seconds) {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, seconds));
    this.updatePlayerState(true);
  }

  jumpToChapter(chapterIdx) {
    if (chapterIdx >= 0 && chapterIdx < DEMO_CHAPTERS.length) {
      this.seekTo(DEMO_CHAPTERS[chapterIdx].startTime);
    }
  }

  prevChapter() {
    if (this.activeChapterIndex > 0) {
      this.jumpToChapter(this.activeChapterIndex - 1);
    }
  }

  nextChapter() {
    if (this.activeChapterIndex < DEMO_CHAPTERS.length - 1) {
      this.jumpToChapter(this.activeChapterIndex + 1);
    }
  }

  updatePlayerState(forceSpeech = false) {
    // Update progress bar
    const percent = (this.currentTime / this.totalDuration) * 100;
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }

    // Format time display
    const currentM = Math.floor(this.currentTime / 60);
    const currentS = Math.floor(this.currentTime % 60);
    const totalM = Math.floor(this.totalDuration / 60);
    const totalS = Math.floor(this.totalDuration % 60);
    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${String(currentM).padStart(2, '0')}:${String(currentS).padStart(2, '0')} / ${String(totalM).padStart(2, '0')}:${String(totalS).padStart(2, '0')}`;
    }

    // Find current chapter
    const currentChapterIdx = DEMO_CHAPTERS.findIndex((ch, idx) => {
      const nextCh = DEMO_CHAPTERS[idx + 1];
      return this.currentTime >= ch.startTime && (!nextCh || this.currentTime < nextCh.startTime);
    });

    if (currentChapterIdx !== -1 && (currentChapterIdx !== this.activeChapterIndex || forceSpeech)) {
      this.activeChapterIndex = currentChapterIdx;
      this.updateScene(currentChapterIdx);
      this.playChime();
      if (this.isPlaying || forceSpeech) {
        this.speakCurrentChapter();
      }
    }
  }

  updateScene(chapterIdx) {
    const chapter = DEMO_CHAPTERS[chapterIdx];
    if (!chapter) return;

    // Update chapter label
    if (this.chapterNameDisplay) {
      this.chapterNameDisplay.textContent = `${chapter.title} — ${chapter.name}`;
    }

    // Update active slide
    const slides = document.querySelectorAll(".demo-slide");
    slides.forEach((s, idx) => {
      if (idx === chapterIdx) {
        s.classList.add("active");
      } else {
        s.classList.remove("active");
      }
    });

    // Update nav pills
    const pills = document.querySelectorAll(".chapter-pill-btn");
    pills.forEach((p, idx) => {
      if (idx === chapterIdx) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });

    // Update subtitle caption text
    if (this.captionText) {
      this.captionText.innerHTML = `<span class="caption-active-word">[${chapter.title}]</span> ${chapter.narration}`;
    }
  }

  speakCurrentChapter() {
    if (!this.speechEnabled || !window.speechSynthesis) return;
    if (this.lastSpokenChapter === this.activeChapterIndex && window.speechSynthesis.speaking) return;

    window.speechSynthesis.cancel();
    const chapter = DEMO_CHAPTERS[this.activeChapterIndex];
    if (!chapter) return;

    const utterance = new SpeechSynthesisUtterance(chapter.narration);
    utterance.rate = this.playbackRate * 1.05;
    utterance.pitch = 1.0;

    // Try to pick a natural English voice
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("English")) && v.lang.startsWith("en"));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    this.lastSpokenChapter = this.activeChapterIndex;
    window.speechSynthesis.speak(utterance);
  }
}

// Initialize when DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.demoApp = new DemoPlayer();
});
