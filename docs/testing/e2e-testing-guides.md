# Run all tests
npx playwright test

# Run a single test file
npx playwright test tests/todo-page.spec.ts

# Run a set of test files
npx playwright test tests/todo-page/ tests/landing-page/

# Run tests at a specific line
npx playwright test my-spec.ts:42

# Run tests by title
npx playwright test -g "add a todo item"
npx playwright test -g "Admin Kelompok Access"

# Run tests in headed browsers
npx playwright test --headed

# Run tests for a specific project
npx playwright test --project=chromium

# Get help
npx playwright test --help

# Run tests spesific
npm run test:e2e -- --grep "sm-hov"
