#!/usr/bin/env bash

echo "--- [CHECK 1]: QUEM SOU EU E ONDE ESTOU ---"
pwd
whoami
python --version

echo "--- [CHECK 2]: CONSIGO LER O MANAGE.PY? ---"
ls -l manage.py

echo "--- [CHECK 3]: TESTANDO CONEXÃO COM O BANCO (SEM RODAR MIGRATE) ---"
# O check apenas tenta carregar as configurações, sem alterar o banco.
python manage.py check

echo "--- PASSO 1: RODANDO MIGRATE ---"
python manage.py migrate --noinput 2>&1

echo "--- PASSO 2: SUBINDO GUNICORN ---"
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT