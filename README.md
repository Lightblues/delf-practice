# DELF Practice App

A macOS desktop application for DELF B2 French exam practice, featuring listening, reading, writing, and speaking exercises with AI-powered evaluation.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.2-green.svg)](https://github.com/Lightblues/delf-practice/releases)

## Features

### 📚 Complete B2 Coverage

- **Part A - Listening** (46 activities): Audio exercises with transcripts
- **Part B - Reading** (46 activities): Comprehension exercises
- **Part C - Writing** (45 activities): Production écrite with AI evaluation
- **Part D - Speaking** (45 activities): Production orale with speech recording & AI feedback

### ✨ Key Features

- **AI Evaluation**: OpenRouter integration with Claude/Gemini for writing & speaking assessment
- **Progress Tracking**: Detailed statistics and history for all exercises
- **Model Answers**: Reference answers for all parts
- **Notes System**: Take notes during practice with auto-save
- **Audio Recording**: Record and review your oral productions
- **PDF Viewer**: Built-in PDF rendering for exercises

## Download

Download the latest release for macOS:

- **Apple Silicon (M1/M2/M3)**: [DELF-Practice-arm64.dmg](https://github.com/Lightblues/delf-practice/releases/latest)
- **Intel**: [DELF-Practice-x64.dmg](https://github.com/Lightblues/delf-practice/releases/latest)

### Installation

Due to lack of code signing, macOS will block the app. After downloading:

1. Open Terminal
2. Run the following command:
   ```bash
   xattr -cr /Applications/DELF\ Practice.app
   ```
3. Launch the app from Applications

## Configuration

### API Key Setup

For Part C (Writing) and Part D (Speaking) evaluation, you need an OpenRouter API key:

1. Get your API key from [OpenRouter](https://openrouter.ai/)
2. Open DELF Practice app
3. Click ⚙️ (Settings) in the header
4. Enter your API key
5. (Optional) Select preferred models

**Default Models**:
- Part C: `anthropic/claude-sonnet-4.5`
- Part D: `google/gemini-3-flash-preview`

## Usage

### Part A/B (Listening/Reading)

1. Select part, exercise, and activity from dropdowns
2. Read/listen to the content
3. Answer multiple choice questions (A/B/C)
4. Submit to see results with color-coded feedback
5. Review transcript (Part A only)

### Part C (Writing)

1. Select exercise type and activity
2. Write your response (minimum 250 words)
3. Click "Soumettre pour évaluation" for AI feedback
4. View detailed scores across 5 criteria (25 points total)
5. Check model answer for reference

### Part D (Speaking)

1. Select topic
2. Record your monologue (5-7 minutes recommended)
3. Review your recording
4. Submit for AI evaluation
5. View scores, transcription, and feedback
6. Compare with model answer structure

### Notes

- Click 📝 in the header to view all notes
- Each activity has a collapsible note editor
- Notes auto-save 1 second after typing
- Filter by part, sort by date
- Click note to navigate to activity

## Data Storage

User data is stored in `~/.ea/delf/`:

```
~/.ea/delf/
├── user/
│   ├── history.json    # Practice sessions and statistics
│   ├── notes.json      # Your notes
│   └── audio/part-d/   # Recorded audio files
└── config.json         # API keys and preferences
```

## Development

### Prerequisites

- Node.js 20+
- macOS (for building)

### Setup

```bash
# Install dependencies
npm install

# Download binary resources (PDF/MP3)
npm run download:resources

# Run in development mode
npm run dev

# Build for production
npm run build
npm run build:mac
```

### Project Structure

```
src/
├── main/          # Electron main process
├── preload/       # IPC bridge
├── renderer/      # React app
│   ├── components/
│   ├── hooks/
│   └── styles/
└── shared/        # Shared types
resources/data/    # Exercise data (JSON + binaries)
```

### Tech Stack

- **Framework**: Electron + React 18 + TypeScript
- **Build**: Vite + electron-vite
- **UI**: Custom CSS (no framework)
- **PDF**: pdf.js
- **Audio**: Web Audio API + MediaRecorder
- **AI**: OpenRouter API (Claude + Gemini)


## License

MIT License - see LICENSE file for details

## Credits

Exercise content from ABC DELF B2 (2025 edition).

---

Built with ❤️ for DELF B2 learners
