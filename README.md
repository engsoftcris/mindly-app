# Mindly – High-Complexity Social Media Platform

Mindly is a professional full-stack social media ecosystem inspired by Twitter/X. Built with **Django REST Framework** and **React**, the platform features a decoupled architecture designed for high performance, security, and advanced content moderation.

This project represents a total effort of **104 Story Points (Fibonacci)**, covering complex business logic such as hybrid feeds, OAuth2, and real-time moderation.

## 🌟 Core Features (Implemented)

### 🔐 Security & Moderation
* **Advanced Ban System:** Backend-enforced suspension with `ban_reason` tracking, immediate JWT invalidation via custom Middleware, and real-time Toast alerts.
* **Safe-Auth Handshake:** Multi-layer verification (status `active`, `banned`, `verified`) on every API request.
* **Blocking System:** Robust user-to-user blocking with automatic content filtering.
* **Admin Dashboard:** Specialized moderation queue for image approval and user reports.

### 📱 Social Engine & Engagement
* **Hybrid Feed:** Intelligent post ordering algorithm with **Infinite Scroll** and optimized database indexing.
* **Follow Logic (48h):** Specialized backend constraint for user follows with dynamic UI state handling.
* **Engagement Tools:** * **Comments:** Integrated system with **GIF selector (3s)**.
    * **Likes:** High-speed endpoints with frontend micro-animations.
    * **Notifications:** Centralized alert center for in-app events.
* **Media Management:** Support for multi-media posts (Text/Video 15s) with custom Gallery filters.

### 🔑 Identity & Privacy
* **Multi-Auth:** Secure login via JWT, **Google OAuth2**, and prepared infra for Phone (OTP).
* **Privacy Toggles:** Full logic for Private/Public profiles (Back + Front).
* **UUID Profiles:** Secure and unique user identifiers with customizable bio and name.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.12, Django 6.0, DRF, PostgreSQL, SimpleJWT, OAuth2 |
| **Frontend** | React (Vite), Tailwind CSS, Axios (Interceptors), React-Toastify |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions (CI/CD) |
| **Testing** | Pytest-django, Faker, Cypress (Infrastructure Ready) |

---

## 🏗 Engineering Excellence

* **Middleware-Driven Safety:** Implementation of a custom `BanMiddleware` to terminate active sessions immediately upon violation.
* **Decoupled Architecture:** Clean separation of concerns with a RESTful API and a state-driven SPA.
* **Automated QA:** Backend integration tests with **Pytest** ensuring 100% reliability on core business rules.
* **Scalable Storage:** Architecture prepared for S3/Cloudinary integration with "Under Analysis" UI states.


```bash
# Execute the full backend test suite (including new Ban Logic)
docker-compose exec backend pytest
