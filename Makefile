# Zenith Trader Development Makefile

.PHONY: help up down logs db-reset db-migrate db-seed dev-build dev-clean

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Zenith Trader Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "$(YELLOW)Usage: make [target]\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Start all services in development mode
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development services started$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Backend API: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Database: localhost:5433$(NC)"
	@echo "$(YELLOW)Redis: localhost:6380$(NC)"

down: ## Stop all services
	docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✓ Services stopped$(NC)"

logs: ## Show logs for all services
	docker-compose -f docker-compose.dev.yml logs -f

logs-db: ## Show database logs
	docker-compose -f docker-compose.dev.yml logs -f postgres

logs-redis: ## Show redis logs
	docker-compose -f docker-compose.dev.yml logs -f redis

db-reset: ## Reset database (WARNING: This will delete all data)
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up -d postgres
	@echo "$(YELLOW)⚠ Database reset - waiting for PostgreSQL to start...$(NC)"
	@sleep 10
	npx prisma migrate dev
	npm run seed
	@echo "$(GREEN)✓ Database reset and seeded$(NC)"

db-migrate: ## Run database migrations
	npx prisma migrate dev
	@echo "$(GREEN)✓ Database migrations completed$(NC)"

db-seed: ## Seed database with initial data
	npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-studio: ## Open Prisma Studio
	npx prisma studio

dev-install: ## Install all dependencies
	npm install
	cd frontend/project && npm install
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

dev-start: ## Start development servers
	@echo "$(GREEN)Starting development servers...$(NC)"
	@echo "$(YELLOW)Backend will start on port 3001$(NC)"
	@echo "$(YELLOW)Frontend will start on port 5173$(NC)"
	@# Start backend in background
	npm run dev &
	@# Start frontend
	cd frontend/project && npm run dev

dev-build: ## Build frontend for production
	cd frontend/project && npm run build
	@echo "$(GREEN)✓ Frontend built for production$(NC)"

dev-clean: ## Clean up development environment
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f
	@echo "$(GREEN)✓ Development environment cleaned$(NC)"

test: ## Run all tests
	@echo "$(YELLOW)Running tests...$(NC)"
	npm test

lint: ## Run linting
	@echo "$(YELLOW)Running linting...$(NC)
	npm run lint 2>/dev/null || echo "Lint script not found in package.json"

format: ## Format code
	@echo "$(YELLOW)Formatting code...$(NC)
	npm run format 2>/dev/null || echo "Format script not found in package.json"

status: ## Show status of all services
	docker-compose -f docker-compose.dev.yml ps