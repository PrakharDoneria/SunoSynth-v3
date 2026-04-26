# 🎵 SunoSynth

SunoSynth is a professional-grade Single Page Application (SPA) music player designed for a premium listening experience. Featuring a stunning glassmorphism UI, advanced animations, and robust playlist management, it transforms your local music collection into a modern digital library.

## ✨ Features

- **Premium UI/UX**: Sleek glassmorphism design with fluid transitions and modern typography.
- **Dynamic Animations**: Immersive visual feedback, including spinning vinyl album art and floating playback controls.
- **Playlist Management**: Create, edit, and organize custom music collections backed by SQLite.
- **SPA Experience**: Seamless navigation and instant interactions without full-page reloads.
- **Responsive Design**: Optimized for various screen sizes, ensuring a consistent experience across devices.

## 🛠️ Tech Stack

- **Backend**: Python (Flask)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, Vanilla CSS (Modern CSS variables, Glassmorphism)
- **Environment**: python-dotenv for secure configuration

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/SunoSynth.git
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
   Create a `.env` file in the root directory (refer to `.env.example` if available) and add your `SECRET_KEY`.

5. **Run the application**:
   ```bash
   python run.py
   ```
   The app will be available at `http://127.0.0.1:5000`.

## 📂 Project Structure

```text
SunoSynth/
├── app/
│   ├── static/          # CSS, JS, and Images
│   ├── templates/       # HTML Templates (Jinja2)
│   ├── models.py        # Database Models
│   ├── routes.py        # Application Routes
│   └── services.py      # Business Logic
├── app.db               # SQLite Database (Auto-generated)
├── run.py               # Entry Point
├── .env                 # Environment Configuration
└── requirements.txt     # Project Dependencies
```

## 📄 License

This project is licensed under the MIT License.
