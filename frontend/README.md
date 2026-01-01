# AI English Quiz MVP (Fast Finish)

## Run
1) Install:
```bash
npm install
```

2) Start:
```bash
npm run dev
```

Open: http://localhost:5173

## Demo accounts
- Teacher: teacher@test.com / 1234
- Student: student@test.com / 1234

## What’s included
- Teacher dashboard: create tests, add questions manually, import CSV, generate AI mock questions.
- Student dashboard: take test, submit, score + review.
- Storage: LocalStorage (easy MVP). Replace later with Flask/DB.

## CSV format
Header row:
question,A,B,C,D,correct

correct can be: A/B/C/D or 0/1/2/3


## Backend (Flask) + AI
Run backend in a second terminal:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then use **AI Generate** tab in Teacher Dashboard.
