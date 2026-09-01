import subprocess
import re

PATTERNS = [
    r"AKIA[0-9A-Z]{16}",
    r"\"private_key\":\s*\"-----BEGIN",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"rzp_(live|test)_[0-9a-zA-Z]{14}",
]

cmd = ["git", "log", "-p", "--all"]
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")

flagged = 0
for line in proc.stdout:
    if line.startswith("+") and not line.startswith("+++"):
        for p in PATTERNS:
            matches = re.findall(p, line)
            real_matches = [m for m in matches if "EXAMPLE" not in str(m) and "your_" not in str(m) and "mock_" not in str(m)]
            if real_matches:
                flagged += 1

print("==================================================")
print("GIT HISTORY AUDIT")
print("==================================================")
if flagged == 0:
    print("STATUS: PASS (Zero active secrets detected in Git commit history)")
else:
    print(f"STATUS: WARNING ({flagged} potential secret occurrences detected in past diffs)")
print("==================================================")
