# Mindly – High-Complexity Social Media Platform

**Mindly** is a professional-grade, full-stack social media ecosystem inspired by Twitter/X.
Built with **Django REST Framework** and **React**, the platform follows a fully **decoupled architecture**, optimized for performance, security, and advanced content moderation.

This project represents a **total engineering effort of 104 Story Points (Fibonacci)**, covering complex business logic such as hybrid feeds, OAuth2 authentication, and real-time moderation workflows.

---

## 🌟 Core Features (Implemented)

### 🔐 Security & Moderation

* **Advanced Ban System**
  Backend-enforced suspensions with `ban_reason` tracking, immediate JWT invalidation via custom Middleware, and real-time Toast alerts on the frontend.
* **Safe-Auth Handshake**
  Multi-layer verification (active, banned, verified) enforced on **every API request**.
* **Blocking System**
  Robust user-to-user blocking with automatic feed, comment, and notification filtering.
* **Admin Dashboard**
  Dedicated moderation queue for image approval and user reports.

---

### 📱 Social Engine & Engagement

* **Hybrid Feed**
  Intelligent post ordering algorithm with Infinite Scroll and optimized database indexing.
* **Follow Logic (48h Rule)**
  Backend-enforced follow constraints with synchronized frontend UI state handling.
* **Engagement Tools**

  * **Comments**: Fully integrated system with GIF selector (≤ 3s).
  * **Likes**: High-performance endpoints with frontend micro-animations.
* **Notifications**
  Centralized in-app alert center for social events.
* **Media Management**
  Support for multi-media posts (Text / Video up to 15s) with custom gallery filters.

---

### 🔑 Identity & Privacy

* **Multi-Auth**
  Secure authentication via JWT, Google OAuth2, and infrastructure prepared for Phone (OTP).
* **Privacy Toggles**
  Complete Public / Private profile logic across backend and frontend.
* **UUID Profiles**
  Secure unique identifiers with customizable bio and display name.

---

## 📊 Project Scale & Complexity

* **Architecture**: Fully decoupled API + SPA
* **Business Rules**: High-density domain logic enforced server-side
* **Security Model**: Middleware-driven, zero-trust request validation
* **Scalability**: Designed for horizontal scaling and cloud storage integration

---

## 🛠 Tech Stack

| Layer              | Technologies                                                                  |
| ------------------ | ----------------------------------------------------------------------------- |
| **Backend**        | Python 3.12, Django 6.0, Django REST Framework, PostgreSQL, SimpleJWT, OAuth2 |
| **Frontend**       | React (Vite), Tailwind CSS, Axios (Interceptors), React-Toastify              |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions (CI/CD)                                |
| **Testing**        | Pytest-django, Faker, Cypress (Infrastructure Ready)                          |

---

## 🏗 Engineering Excellence

* **Middleware-Driven Safety**
  Custom `BanMiddleware` terminates active sessions immediately upon policy violations.
* **Decoupled Architecture**
  Clean separation of concerns with a RESTful API and a state-driven SPA.
* **Automated QA**
  Backend integration tests with Pytest ensuring reliability of core business rules.
* **Scalable Storage**
  Architecture prepared for S3 / Cloudinary integration with explicit *“Under Analysis”* UI states.
  :)

  

---

> **Mindly is not a demo project.**
> It is an engineering-focused platform designed to simulate real-world social media complexity at scale.
