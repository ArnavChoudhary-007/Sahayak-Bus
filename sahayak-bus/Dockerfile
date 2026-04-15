FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy all local files into the build stage.
COPY . .

RUN npm ci && npm run build

FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and built frontend assets.
COPY . .
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8080

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 0 app:app"]
