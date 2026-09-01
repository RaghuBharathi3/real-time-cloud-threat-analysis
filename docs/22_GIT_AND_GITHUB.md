# 22. Git Workflow and Repository Security

## Purpose
This document specifies Git repository hygiene, pre-commit security verification, and credential protection rules.

---

## 1. Repository File Structure

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
├── credentials/          [GIT IGNORED]
├── data/
│   └── raw/
├── docs/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── logs/                 [GIT IGNORED]
├── scripts/
└── tests/
```

---

## 2. Pre-Commit Security Checklist

Before committing changes, execute this verification procedure:

1. **Check Status**:
   ```bash
   git status
   ```
   Verify that `.env`, `credentials/`, `*.db`, and `logs/` are not listed.
2. **Verify Ignore Rules**:
   ```bash
   git check-ignore .env credentials/gcp-service-account.json
   ```
3. **Execute Test Suite**:
   ```bash
   pytest tests/
   ```
4. **Validate Frontend Build**:
   ```bash
   npm run build --prefix frontend
   ```

---

## 3. Accidental Secret Exposure Remediation

If a secret is ever committed:
1. Immediately rotate the compromised credential in the cloud provider console.
2. Purge the secret from Git history using `git filter-repo` or BFG Repo-Cleaner.
3. Creating a new commit that simply deletes the file is insufficient because Git history retains prior versions.
