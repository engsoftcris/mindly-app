#!/usr/bin/env bash

echo "--- [CHECK 1]: QUEM SOU EU E ONDE ESTOU ---"
pwd
whoami
python --version

echo "--- [CHECK 2]: CONSIGO LER O MANAGE.PY? ---"
ls -l manage.py

echo "--- [CHECK 3]: TESTANDO CONEXÃO COM O BANCO (SEM RODAR MIGRATE) ---"
python manage.py check

echo "--- PASSO 1: RODANDO MIGRATE ---"
python manage.py migrate --noinput 2>&1

# --- NOVO: CRIANDO O SUPERUSER SEM INTERAÇÃO ---
echo "--- PASSO 1.5: CRIANDO SUPERUSER ---"
# O '|| true' serve para o script não travar caso o usuário já exista
python manage.py createsuperuser --noinput || echo "Superuser já existe ou erro na criação."

echo "--- PASSO 2: SUBINDO GUNICORN ---"
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT