==========================================================
  FitPulse - Premium Fitness Tracker (Website Edition)
==========================================================

A standalone website version of FitPulse that runs in any
modern browser (Chrome, Firefox, Edge, Safari, Brave).

----------------------------------------------------------
  REQUIREMENTS
----------------------------------------------------------
  - Node.js v18 or higher (download: https://nodejs.org)
  - That's it. No database setup. No cloud accounts.

----------------------------------------------------------
  HOW TO RUN (3 STEPS)
----------------------------------------------------------

  STEP 1 - Install dependencies (one-time, ~30 seconds):
      Open a terminal in this folder and run:
          npm install

  STEP 2 - Start the server:
          npm start
      OR double-click:
          start.bat        (on Windows)
          start.sh         (on Mac / Linux)

  STEP 3 - Open in your browser:
          http://localhost:3000

----------------------------------------------------------
  DEMO ACCOUNT (auto-created on first launch)
----------------------------------------------------------
      Email:     demo@fitpulse.app
      Password:  demo123

  Or click "Get Started" to create your own account.

----------------------------------------------------------
  WHAT'S INCLUDED
----------------------------------------------------------
  ✓ Full FitPulse fitness tracker UI (same design as mobile)
  ✓ User authentication (register, login, change email/pwd)
  ✓ Workout plans (Beginner, HIIT, Strength, Yoga, 5K)
  ✓ Exercise library (12+ exercises with instructions)
  ✓ Workout timer & calorie tracking
  ✓ Goals tracking
  ✓ BMI calculator
  ✓ Progress charts (weekly / monthly)
  ✓ Profile & settings
  ✓ Dark theme with purple-orange-cyan gradients
  ✓ Local SQLite database (auto-created as fitpulse.db)

----------------------------------------------------------
  FILES
----------------------------------------------------------
  server.js          - The Node.js backend + API
  package.json       - Dependencies
  public/            - The compiled web app (HTML/CSS/JS)
  fitpulse.db        - Your data (created on first run)
  start.bat          - One-click start for Windows
  start.sh           - One-click start for Mac / Linux

----------------------------------------------------------
  PORT
----------------------------------------------------------
  Default port: 3000
  To change: set PORT environment variable, e.g.
      PORT=8080 npm start

----------------------------------------------------------
  YOUR DATA
----------------------------------------------------------
  All data is stored locally in fitpulse.db (SQLite file)
  in this same folder. To reset, just delete that file
  and restart the server — the demo account will be
  re-seeded automatically.

==========================================================
