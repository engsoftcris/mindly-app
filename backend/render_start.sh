#!/usr/bin/env bash
# Sair imediatamente se um comando falhar
set -e

echo "--> Rodando Migrations..."
python manage.py migrate

echo "--> Iniciando Gunicorn..."
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT