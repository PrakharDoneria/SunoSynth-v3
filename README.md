# 🎵 SunoSynth — Dive Into Your Rhythm

SunoSynth is a professional-grade Single Page Application (SPA) music player designed for a premium listening experience. Featuring a stunning glassmorphism UI, advanced vinyl animations, and robust playlist management, it transforms your music exploration into a modern digital experience.

## ✨ Features

- **Premium UI/UX**: Sleek glassmorphism design with fluid transitions, vibrant gradients, and modern typography (Inter & Space Grotesk).
- **Immersive Animations**: 
    - **Spinning Vinyl**: Album art rotates fluidly with a realistic groove effect and center hole.
    - **Dynamic Waveforms**: Staggered, fluid bar animations that react visually to playback.
    - **Liquid Transitions**: Smooth page transitions using a custom liquid fade effect.
- **Advanced Player**:
    - **Persistence**: Smart playback state saving — resumes your song and timestamp even after a refresh.
    - **Mobile First**: Fully optimized mobile overlay with a dedicated "Up Next" queue management system.
    - **Smart Queue**: Auto-builds upcoming tracks based on your listening taste using a recommendation engine.
- **Library Management**: Create, organize, and manage custom playlists backed by SQLite.
- **Search**: Fast, filterable search across millions of tracks via JioSaavn API integration.

## 🛠️ Tech Stack

- **Backend**: Python 3.12 (Flask)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: Vanilla HTML5/CSS3/JavaScript (Modern ES6+)
- **Icons**: Lucide Icons
- **Production**: Gunicorn (WSGI Server)

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- pip

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/PrakharDoneria/SunoSynth-v3.git
   cd SunoSynth
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your_super_secret_key
   FLASK_ENV=development
   ```

5. **Run the application**:
   ```bash
   python run.py
   ```
   The app will be available at `http://127.0.0.1:5000`.

## 🌐 Production Deployment (Render)

SunoSynth is ready for production deployment on [Render](https://render.com).

1. **Create a New Web Service** on Render.
2. **Connect your GitHub repository**.
3. **Environment**: Select `Python`.
4. **Build Command**: 
   ```bash
   pip install -r requirements.txt
   ```
5. **Start Command**: 
   ```bash
   gunicorn run:app
   ```
6. **Environment Variables**:
   - `SECRET_KEY`: A long random string.
   - `PYTHON_VERSION`: `3.12.0` (or your preferred version).

## 📂 Project Structure

```text
SunoSynth/
├── app/
│   ├── static/          # CSS (Design System), JS (SPA Core), Images
│   ├── templates/       # HTML Templates (Jinja2 Partials)
│   ├── models.py        # Database Models
│   ├── routes.py        # API & SPA Routes
│   └── services.py      # JioSaavn API Integration
├── app.db               # SQLite Database
├── run.py               # WSGI Entry Point
├── .env.example         # Template for environment variables
└── requirements.txt     # Production dependencies
```

## 📄 License

This project is licensed under the MIT License.
