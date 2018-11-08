PROJECT = "MingoDB"

test:
	@echo "Testing ${PROJECT}..."
	@./node_modules/.bin/mocha test/index.js

install:
	@echo "Installing ${PROJECT}..."
	@npm install

clean:
	@echo "Cleaning ${PROJECT}..."
	@rm -rf node_modules

.PHONY: test install clean