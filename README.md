# AI HelpDesk for Colleges

A polished full-stack AI helpdesk web app for colleges and universities built with React, Vite, Tailwind CSS, Node.js, Express, and JSON storage.

This starter is currently branded for Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur, Chhattisgarh, India, with sample content aligned to the official ABVV website and public contact details.

## Features

- Premium chat UI with sidebar, dark mode, quick actions, typing indicator, and timestamps
- REST APIs for chat, FAQs, feedback, and admin data editing
- Gemini integration with safe mock fallback when no API key is configured
- Local knowledge base for admissions, fees, exams, scholarships, and contacts
- English + Hindi responses
- Browser-based chat history persistence
- Admin page to edit helpdesk content

## Project Structure

```text
HelpDesk/
  README.md
  backend/
    .env.example
    package.json
    data/
      admission.json
      contacts.json
      exams.json
      fees.json
      scholarship.json
    storage/
      feedback.json
    src/
      app.js
      server.js
      controllers/
      routes/
      services/
  frontend/
    package.json
    index.html
    postcss.config.js
    tailwind.config.js
    vite.config.js
    src/
      App.jsx
      index.css
      main.jsx
      components/
      lib/
      pages/
```

## Prerequisites

- Node.js 18+ recommended
- npm

## Setup Instructions

### 1. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env` from `backend/.env.example`.

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Optional frontend environment:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Run the project

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

- `POST /api/chat`
- `GET /api/faqs`
- `POST /api/feedback`
- `GET /api/admin/topics`
- `PUT /api/admin/topics/:topic`

## How Gemini Works

1. Add your Gemini key to `backend/.env`.
2. Restart the backend.
3. The server will call Gemini for college-related questions using `GEMINI_MODEL` or the default `gemini-2.5-flash`.
4. If Gemini is unavailable or the key is missing, mock knowledge-base replies are used automatically.

## Local Storage and Knowledge Base

- Chat history is stored in browser local storage.
- Feedback is stored in `backend/storage/feedback.json`.
- Helpdesk content lives in:
  - `backend/data/admission.json`
  - `backend/data/fees.json`
  - `backend/data/exams.json`
  - `backend/data/scholarship.json`
  - `backend/data/contacts.json`

## Free Deployment

### Deploy frontend on Vercel

1. Push the project to GitHub.
2. Create a new Vercel project.
3. Set the root directory to `frontend`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   - `VITE_API_BASE_URL=https://your-render-service.onrender.com`

### Deploy backend on Render

1. Create a new Web Service in Render.
2. Connect the same GitHub repository.
3. Set the root directory to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `PORT=5000`
   - `FRONTEND_URL=https://your-vercel-app.vercel.app`
   - `GEMINI_API_KEY=your_key_here`

## Notes

- The app is intentionally scoped to college helpdesk questions only.
- The admin page edits JSON data directly, which keeps the project simple and easy to maintain.
- The current sample branding is set to Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur, Chhattisgarh, India.
