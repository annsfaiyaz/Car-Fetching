# Use official Python slim image
FROM python:3.11-slim

# Shared browser path (root installs, appuser runs)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Set working directory
WORKDIR /app

# Install basic system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

# Install Python dependencies only (app runs from source tree, not as a wheel)
WORKDIR /app/backend
RUN pip install --no-cache-dir $(python3 -c "\
import tomllib; \
deps = tomllib.load(open('pyproject.toml', 'rb'))['project']['dependencies']; \
print(' '.join(deps))")

# Install Chromium after pip so browser build matches playwright package version
RUN playwright install --with-deps chromium

# Expose port (default FastAPI port)
EXPOSE 8000

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app /ms-playwright
USER appuser

# Set environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/backend

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]