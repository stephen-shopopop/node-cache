#!make

## Set 'bash' as default shell
SHELL := $(shell which bash)

## Set 'help' target as the default goal
.DEFAULT_GOAL := help

## Test if the dependencies we need to run this Makefile are installed
NPM := $(shell command -v npm)
MISE := $(shell command -v mise)

## Versions
NODE ?= $(shell cat $(PWD)/.nvmrc 2> /dev/null || echo v24)

.PHONY: help
help: ## Show this help
	@echo 'Usage: make [target] ...'
	@echo ''
	@echo 'targets:'
	@egrep -h '^[a-zA-Z0-9_\/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort -d | awk 'BEGIN {FS = ":.*?## "; printf "Usage: make \033[0;34mTARGET\033[0m \033[0;35m[ARGUMENTS]\033[0m\n\n"; printf "Targets:\n"}; {printf "  \033[33m%-25s\033[0m \033[0;32m%s\033[0m\n", $$1, $$2}'

.PHONY: requirements
requirements: ## Check if the requirements are satisfied
ifndef NPM
	@echo "📦🧩 npm is not available. Please install npm."
	@exit 1
endif
	@echo "🆗 The necessary dependencies are already installed!"

.PHONY: setup
setup: ## 📦 Installing global dependencies (mise)
	@echo "🍿 Installing dependencies for mac with homebrew (https://brew.sh)... "
	@brew install mise
	@echo "🔰 ......................."
	@echo "Add to your shell config (~/.zshrc or ~/.bashrc):"
	@echo "  eval \"\$$(mise activate zsh)\"  # or 'bash' for bash users"
	@echo "  alias mr=\"mise run\""
	@echo "🔰 ......................."

.PHONY: install
install: requirements ## 📦 Install project dependencies
	@echo "📦 Installing project dependencies..."
	@npm install
	@echo "✅ Dependencies installed!"

.PHONY: build
build: ## 🔨 Build the project
	@echo "🔨 Building project..."
	@npm run build
	@echo "✅ Build completed!"

.PHONY: test
test: ## 🧪 Run tests with coverage
	@echo "🧪 Running tests..."
	@npm run test

.PHONY: test-types
test-types: ## 🧪 Run type tests
	@echo "🧪 Running type tests..."
	@npm run test:types

.PHONY: coverage
coverage: ## 📊 Run tests with coverage report
	@echo "📊 Running tests with coverage..."
	@npm run coverage

.PHONY: bench
bench: ## ⚡ Run benchmarks
	@echo "⚡ Running benchmarks..."
	@npm run bench

.PHONY: lint
lint: ## 🔍 Lint the code
	@echo "🔍 Linting code..."
	@npm run lint

.PHONY: format
format: ## 🎨 Format the code
	@echo "🎨 Formatting code..."
	@npm run format

.PHONY: check
check: ## ✅ Type check and lint
	@echo "✅ Running type check and lint..."
	@npm run check

.PHONY: clean
clean: ## 🧹 Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@npm run clean
	@echo "✅ Clean completed!"

.PHONY: maintenance
maintenance: ## 🔧 Full maintenance (clean all)
	@echo "🔧 Running full maintenance..."
	@npm run maintenance
	@echo "✅ Maintenance completed!"

.PHONY: docs
docs: ## 📚 Generate documentation
	@echo "📚 Generating documentation..."
	@npm run docs
	@echo "✅ Documentation generated in ./docs"

.PHONY: deps-update
deps-update: ## 📦 Update dependencies
	@echo "📦 Checking for dependency updates..."
	@npm run deps:update

.PHONY: deps-unused
deps-unused: ## 🔍 Check for unused dependencies
	@echo "🔍 Checking for unused dependencies..."
	@npm run deps:unused

.PHONY: docker-up
docker-up: ## 🐳 Start Docker containers
	@echo "🐳 Starting Docker containers..."
ifdef MISE
	@mise run docker-compose-up
else
	@docker compose -f compose.yml up -d
endif
	@echo "✅ Docker containers started!"

.PHONY: docker-down
docker-down: ## 🐳 Stop Docker containers
	@echo "🐳 Stopping Docker containers..."
ifdef MISE
	@mise run docker-compose-down
else
	@docker compose -f compose.yml down --rmi local --volumes --remove-orphans
endif
	@echo "✅ Docker containers stopped!"

.PHONY: docker-prune
docker-prune: ## 🐳 Prune Docker resources
	@echo "🐳 Pruning Docker resources..."
ifdef MISE
	@mise run docker-builder-prune
else
	@docker builder prune -a && docker image prune && docker network prune
endif
	@echo "✅ Docker resources pruned!"

.PHONY: tarball-check
tarball-check: ## 📦 Check npm package tarball
	@echo "📦 Checking npm package..."
	@npm run tarball:check

.PHONY: publish-dry-run
publish-dry-run: ## 📦 Dry run npm publish
	@echo "📦 Dry run npm publish..."
	@npm run publish:dry-run

.PHONY: dev
dev: docker-up ## 🚀 Start development environment
	@echo "🚀 Development environment ready!"

.PHONY: ci
ci: check test ## 🤖 Run CI checks (lint + type check + tests)
	@echo "✅ CI checks passed!"

.PHONY: all
all: clean install build test docs ## 🎯 Run all: clean, install, build, test, docs
	@echo "🎯 All tasks completed!"
