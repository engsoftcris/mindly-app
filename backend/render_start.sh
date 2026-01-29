#!/usr/bin/env bash
echo "--- PASSO 1: SCRIPT INICIOU ---"
python manage.py migrate --noinput
echo "--- PASSO 2: MIGRATE TERMINOU ---"
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT