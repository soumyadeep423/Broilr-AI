# 👨‍🍳 Broilr - AI Cooking Assistant

Broilr is an intelligent cooking assistant powered by **Gemini 2.0 Flash** that helps you generate, personalize, and interactively walk through recipes based on your preferences and voice commands.

🧠 It remembers context, answers your step-by-step queries, and saves recipes to your profile — all with a seamless **Flask + React** full-stack setup.

### [🚀 Live Link](https://broilr-ai.vercel.app/)
---

## 🌟 Features

- 🍽️ **AI Recipe Generator** using Gemini API
- 🗣️ **Conversational Cooking Assistant** with follow-up Q&A
- 🔐 **JWT Auth** (Signup/Login)
- 🧠 **Gemini Memory** for contextual follow-ups
- 💾 **Save, Load & Delete Recipes** (MongoDB)
- 🎤 **Voice Command Ready** (Frontend-Ready)
- 🧪 **Structured Recipes** with ingredients, tools & step timing

---

## 🛠 Tech Stack

**Frontend**:  
React • Vite • TailwindCSS • React Router DOM

**Backend**:  
Flask • MongoDB • Google Generative AI • PyMongo

**Deployment**:  
Render (Backend) • Vercel (Frontend)

---

## 🚀 Getting Started

### Backend (Flask)

```bash
git clone https://github.com/soumyadeep423/broilr-ai.git
cd broilr-ai
pip install -r requirements.txt
```

> Add a `.env` file:

```env
MONGO_URI=your_mongo_uri
GEMINI_API_KEY=your_gemini_api_key
```

Then run:

```bash
python app.py
```

### Frontend (React + Vite)

```bash
cd broilr-frontend
npm install
npm run dev
```

---

## 🔍 Key API Routes

* `POST /signup` — Register new user
* `POST /login` — Login user
* `POST /generate_recipe` — Generate recipe from dish + answers
* `POST /followups` — Get personalization questions
* `POST /ask_step` — Ask about a current recipe step
* `POST /save_recipe` — Save recipe to DB
* `POST /load_recipes` — Load saved recipes
* `POST /delete_recipe` — Remove a recipe

---

## 📦 Project Structure

```
broilr-ai/
├── app.py              # Main Flask app
├── auth.py             # Authentication logic
├── gemini.py           # Gemini API integrations
├── broilr-frontend/    # Vite + React frontend
└── requirements.txt    # Python dependencies
```


## 🔐 Authentication

* Secure password hashing using **bcrypt**
* User-specific recipe data stored in **MongoDB**
* Integrated login/signup flow via API

---


> “Broilr brings AI to your kitchen — one smart recipe at a time.” 🍳
