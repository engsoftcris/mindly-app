# 🔄 Weekly Retrospective: The Journey to Full Stack
**Date:** January 24, 2026  
**Focus:** Process Improvement & Personal Growth

---

## 🌟 What Went Well (Wins)
* **Confidence Boost:** I can now navigate the `models.py` -> `migrations` -> `admin.py` workflow without relying solely on tutorials.
* **Conflict Resolution:** Handled complex Git merge conflicts and Linux file permissions (`chown`)—tasks that usually scare beginners.
* **Code Quality:** Successfully implemented a "Dry" and safe image validation logic using `hasattr`, preventing server crashes.
* **Review Habit:** Re-watching course modules and re-doing exercises has significantly cleared up previous doubts.



---

## 🛠️ Challenges & Blockers (Learning Moments)
* **Permission Issues:** Encountered "Permission Denied" errors due to Docker/Root ownership. 
    * *Solution:* Learned to use `sudo chown -R $USER:$USER .` to regain control of the workspace.
* **Git Confusion:** The `main` branch got out of sync with local untracked files. 
    * *Solution:* Mastered `git clean -fd` and `git reset --hard origin/main` to restore a clean state.
* **Route Logic:** URLs and the MVT (Model-View-Template) flow are still becoming clear.
    * *Action:* Need to practice more hands-on route creation in the next sprint.



---

## 📈 Evolution vs. Learning Path
* **Phase 12 (Mastery):** I am now comfortable with Django Admin customization and User Model extensions.
* **Phase 13 (In Progress):** I am successfully using isolated branches for features and collaborating with a "peer" (AI) via Pull Requests.

---

## 🎯 Action Plan for Next Week
1.  **Stop & Think:** Before coding a new feature, draw the data relationship on paper.
2.  **API First:** Focus on understanding how a Serializer transforms a Python Object into JSON.
3.  **Test Early:** Start exploring `pytest` basics to avoid manual testing every time.



---
**"The goal is not to be a better coder than yesterday, but to be a better architect of your own ideas."**
