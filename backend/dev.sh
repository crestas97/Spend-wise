#!/usr/bin/env bash
# Starts the Flask API using the settings in the project's .env file.
set -a
source ../.env
set +a
export DATABASE_URL="postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
flask --app wsgi run --debug
