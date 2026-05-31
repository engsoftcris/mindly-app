# Mindly – High-Complexity Social Media Platform

Mindly is a full-stack social media platform inspired by Twitter/X, built with Django REST Framework and React. The project follows a decoupled architecture, separating frontend and backend responsibilities while implementing advanced social networking features, moderation workflows, and authentication mechanisms.

This project represents a complete software engineering workflow, including requirements gathering, backlog management, sprint planning, system architecture, database modeling, testing, deployment, and documentation.

## Core Features

### Security & Moderation

* User banning system with ban reason tracking.
* Middleware-based request validation.
* User blocking system with interaction restrictions.
* Administrative moderation dashboard.
* Content reporting workflow.

### Social Features

* Personalized feed based on followed users.
* Follow and unfollow system with business-rule validation.
* Like system for posts.
* Comment system with GIF support.
* In-app notifications.
* Profile privacy controls.

### Content Management

* Text posts.
* Image uploads.
* Short video support.
* User profile customization.
* Media filtering and profile galleries.

### Authentication

* Google OAuth2 authentication.
* JWT-based API authentication.
* Custom user model.
* Secure session handling.

## Technical Architecture

### Backend

* Python
* Django
* Django REST Framework
* SimpleJWT
* PostgreSQL (Supabase)

### Frontend

* React
* Vite
* Tailwind CSS
* Axios
* React Toastify

### Infrastructure

* Docker
* Docker Compose
* Render (Backend Hosting)
* Vercel (Frontend Hosting)
* Supabase (Database)

### Testing

* Pytest
* Pytest-Django
* Faker
* Cypress

## Engineering Highlights

* Fully decoupled REST architecture.
* Custom authentication and authorization flow.
* Advanced domain business rules.
* Middleware-driven security validation.
* Automated backend testing.
* Production deployment using Render, Vercel, and Supabase.

## Project Goal

Mindly was developed as a software engineering project focused on applying modern web development practices, API design, authentication, social interactions, moderation systems, testing strategies, and cloud deployment workflows.
