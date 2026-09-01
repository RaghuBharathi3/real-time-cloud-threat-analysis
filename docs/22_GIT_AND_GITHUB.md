# 22. Git Workflow & GitHub Security Guidelines

This guide describes repository management, commit hygiene, and secret protection procedures.

---

## 1. Repository Structure

```text
PROJECT_ROOT/
├── .env.example
├── .gitignore
├── README.md
├── RUN_PROJECT.md
├── START_PROJECT.bat
├── STOP_PROJECT.bat
├── RESTART_PROJECT.bat
├── backend/
│   ├── app/
│   │   ├── adapters/
│   │   ├── modules/
│   │   ├── config.py
│   │   ├── db.py
│   │   └── main.py
│   ├── models/
│   └── requirements.txt
├── credentials/          <-- [GIT IGNORED]
├── data/
│   └── raw/
├── docs/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── logs/                 <-- [GIT IGNORED]
├── scripts/
└── tests/
```

---

## 2. Pre-Commit Security Checklist

Before committing or pushing to GitHub, run the following verification checklist:

1. **Verify Ignored Secret Files**:
   ```bash
   git status
   ```
   Ensure `.env`, `credentials/`, `*.db`, and `logs/` are **NOT** listed in staged or untracked files.
2. **Test File Exclusion**:
   ```bash
   git check-ignore .env credentials/gcp-service-account.json
   ```
3. **Execute Test Suite**:
   ```bash
   pytest tests/
   ```
4. **Build Frontend**:
   ```bash
   npm run build --prefix frontend
   ```

---

## 3. Incident Procedure (Accidental Exposure)

If a secret is ever accidentally staged or pushed:
1. **Immediately Rotate Key**: Deactivate the compromised key in AWS/Azure/GCP console and issue a new one.
2. **Remove from Git History**: Use `git filter-repo` or BFG Repo-Cleaner.
3. **Never simply make a new commit** that deletes the file, as it remains in git history.
