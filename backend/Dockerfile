FROM python:3.12-slim

# Evita que o Python gere arquivos .pyc e garante logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Garante que o Poetry instale pacotes no sistema do container (sem venv isolada)
ENV POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# Instala dependências do sistema necessárias para o Postgres e o Poetry
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala o Poetry
RUN pip install poetry

# Copia os arquivos de configuração do Poetry
COPY pyproject.toml poetry.lock* /app/

# Instala as dependências (se o lock não existir, ele ignora o erro e instala do toml)
RUN poetry install --no-interaction --no-ansi

# Copia o resto do código
COPY . /app/