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

## 📦 Como Rodar o Projeto Localmente

### Pré-requisitos
Você precisará ter instalado na sua máquina:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### 1. Clonar o Repositório
```bash
git clone [https://github.com/seu-usuario/mindly-app.git](https://github.com/seu-usuario/mindly-app.git)
cd mindly-app
```

### 2. Configurar Variáveis de Ambiente (`.env`)

O projeto depende de serviços externos para o armazenamento de mídias (Supabase S3), autenticação social (Google/Firebase) e busca de GIFs (Giphy). Crie os arquivos `.env` nas respectivas pastas antes de subir os containers:

#### 🔹 No diretório `backend/.env`
Crie o arquivo e configure as chaves do **Supabase S3 Storage**. 
*(Nota: O banco de dados PostgreSQL de desenvolvimento rodará localmente via Docker)*

```env
DEBUG=1
SECRET_KEY=supersecretkey
ALLOWED_HOSTS=*

# Configurações do Banco de Dados Local (Docker)
DB_NAME=mindly_db
DB_USER=mindly_admin
DB_PASSWORD=mindly_pass
DB_HOST=db
DB_PORT=5432

# Supabase S3 Storage
AWS_ACCESS_KEY_ID=seu_access_key_id_aqui
AWS_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
AWS_STORAGE_BUCKET_NAME=mindly-media
AWS_S3_REGION_NAME=us-east-1
AWS_S3_ENDPOINT_URL=https://<seu-project-id>.storage.supabase.co/storage/v1/s3
```

#### 🔹 No diretório `frontend/.env`
Crie o arquivo e configure as chaves da API do **Giphy** e as credenciais do **Firebase / Google OAuth**:

```env
VITE_FIREBASE_API_KEY=sua_chave_firebase_aqui
VITE_FIREBASE_AUTH_DOMAIN=mindly-app-96bfb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mindly-app-96bfb
VITE_FIREBASE_APP_ID=seu_app_id_firebase_aqui
VITE_GOOGLE_CLIENT_ID=seu_client_id_google_oauth_aqui
VITE_API_URL=http://localhost:8000/api
VITE_GIPHY_API_KEY=sua_api_key_do_giphy_aqui
```

> 💡 **Nota sobre o Giphy:** Caso as chaves do Giphy não sejam fornecidas ou a cota de requisições gratuitas seja estourada (Erros 403/429), o sistema possui um fallback automático no componente `GiftSelector` que desativa o recurso graciosamente sem quebrar a aplicação (`setCanUseGifs(false)`).

---

### 3. Subir os Containers com Docker

Com os arquivos `.env` devidamente preenchidos, execute o comando abaixo na raiz do projeto:

```bash
docker-compose up --build
```

- **Backend (API):** Disponível em `http://localhost:8000`
- **Frontend (SPA):** Disponível em `http://localhost:5173`

---

## 🧪 Qualidade de Código e Testes

O projeto segue padrões estritos de qualidade, tipagem e estilo. Antes de abrir um Pull Request, garanta que todas as checagens locais estejam passando:

### Backend (Python/Django)
```bash
# Rodar a suíte de testes integrada (138 testes)
docker-compose exec backend pytest

# Validação estrita de tipagem estática (Mypy)
docker-compose exec backend mypy .

# Verificação de qualidade de código e PEP 8 (Pylint - Meta: 10.00/10)
docker-compose exec backend pylint accounts/

# Formatação automatizada de estilo
docker-compose exec backend black .
```

### Frontend (JavaScript/React)
```bash
# Formatação com Prettier e análise estática completa com ESLint (v9+)
docker-compose exec frontend npm run check-all
```

---

## 🚀 Arquitetura de Produção (Deployment)

Quando a branch `main` recebe um merge, o pipeline de CI/CD está preparado para realizar o deploy automatizado utilizando a seguinte infraestrutura homologada:

- **Frontend:** [Vercel](https://vercel.com/) (Ideal para hospedagem e distribuição global de SPAs em Vite/React).
- **Backend:** [Render](https://render.com/) ou Railway (Instâncias robustas para containers Docker com suporte a Django).
- **Banco de Dados & Storage de Mídias:** [Supabase](https://supabase.com/) (Persistência de dados em produção usando o PostgreSQL gerenciado e buckets S3 estáveis).






