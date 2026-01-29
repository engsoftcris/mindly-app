#!/usr/bin/env bash
set -e

echo "--> Rodando Migrations..."
python manage.py migrate --noinput

echo "--> Iniciando Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
