# Contributing to UndetectBrowser 🤝

Thank you for your interest in contributing to UndetectBrowser! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

###  Expected Behavior

- ✅ Be respectful and inclusive
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members

### Unacceptable Behavior

- ❌ Harassment or discriminatory language
- ❌ Trolling or insulting comments
- ❌ Public or private harassment
- ❌ Publishing others' private information

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- Git
- Basic understanding of TypeScript
- Familiarity with Puppeteer

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/new-undetect-browser.git
cd new-undetect-browser

# 3. Add upstream remote
git remote add upstream https://github.com/wpeva/new-undetect-browser.git

# 4. Install dependencies
npm install

# 5. Create a branch for your work
git checkout -b feature/my-amazing-feature

# 6. Run tests to ensure everything works
npm test

# 7. Start development
npm run dev
```

---

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync your fork:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `perf/` - Performance improvements

### 3. Make Your Changes

- Write clean, maintainable code
- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run specific tests
npm run test:unit:new

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format

# Full validation
npm run validate
```

### 5. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(cache): add LRU eviction policy"
git commit -m "fix(pool): resolve resource leak in error case"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(memoization): add edge case tests"
git commit -m "perf(monitor): optimize percentile calculation"
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions or fixes
- `perf` - Performance improvements
- `chore` - Build process or auxiliary tool changes

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill in the PR template
5. Submit the PR

---

## Coding Standards

### TypeScript Style Guide

#### General Rules

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // Implementation
}

// ❌ Bad
interface user {
  ID: any;
  NAME: any;
}

function GetUser(ID: any) {
  // Implementation
}
```

#### Naming Conventions

- **Classes**: PascalCase - `UndetectBrowser`, `PerformanceMonitor`
- **Interfaces**: PascalCase - `BrowserProfile`, `LaunchOptions`
- **Functions**: camelCase - `createProfile`, `measureTime`
- **Variables**: camelCase - `userAgent`, `maxRetries`
- **Constants**: UPPER_SNAKE_CASE - `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- **Private members**: prefix with `_` - `_cache`, `_pool`

#### Type Annotations

```typescript
// ✅ Always specify types for public APIs
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  // Implementation
}

// ✅ Use interfaces for objects
interface CacheConfig {
  maxSize: number;
  ttl: number;
}

// ✅ Use type aliases for unions
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ❌ Avoid any
function process(data: any) { // Bad
  // Implementation
}

// ✅ Use unknown or specific types
function process(data: unknown) { // Good
  // Implementation with type guards
}
```

#### Error Handling

```typescript
// ✅ Use custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Always handle errors
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation failed', error);
  } else {
    logger.error('Unexpected error', error);
    throw error;
  }
}

// ❌ Don't swallow errors
try {
  await riskyOperation();
} catch (error) {
  // Bad: error ignored
}
```

#### Async/Await

```typescript
// ✅ Use async/await over promises
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

// ✅ Handle Promise.all for parallel operations
const results = await Promise.all([
  fetchData('url1'),
  fetchData('url2'),
  fetchData('url3'),
]);

// ❌ Don't mix .then() and async/await
async function bad() {
  return fetch('url').then(r => r.text()); // Bad
}
```

### Code Organization

```typescript
// File structure (top to bottom):

// 1. Imports
import { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';

// 2. Types and Interfaces
export interface Config {
  timeout: number;
}

// 3. Constants
const DEFAULT_TIMEOUT = 30000;

// 4. Main class/function
export class MyClass {
  // 4.1 Private properties
  private _cache: Map<string, any>;

  // 4.2 Constructor
  constructor(config: Config) {
    this._cache = new Map();
  }

  // 4.3 Public methods
  public async process(): Promise<void> {
    // Implementation
  }

  // 4.4 Private methods
  private async _helperMethod(): Promise<void> {
    // Implementation
  }
}

// 5. Helper functions
function helperFunction() {
  // Implementation
}
```

### Documentation

#### JSDoc Comments

```typescript
/**
 * Creates a memoized version of the function that caches results
 * based on the argument value.
 * 
 * @template T - Type of the function argument
 * @template R - Type of the function return value
 * @param fn - Function to memoize
 * @returns Memoized function that returns cached results
 * 
 * @example
 * ```typescript
 * const expensiveFn = (x: number) => x * x;
 * const memoized = memoize(expensiveFn);
 * 
 * console.log(memoized(5)); // Calculates
 * console.log(memoized(5)); // Returns cached result
 * ```
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  // Implementation
}
```

#### Comment Guidelines

```typescript
// ✅ Explain WHY, not WHAT
// Use LRU eviction to prevent memory overflow
cache.evict(oldestKey);

// ❌ Don't state the obvious
// Increment counter by 1
counter++;

// ✅ Document complex logic
// Calculate P95 by finding the value at 95% position
// after sorting all samples in ascending order
const p95Index = Math.ceil(samples.length * 0.95) - 1;
const p95 = sortedSamples[p95Index];

// ✅ Mark TODOs clearly
// TODO: Add retry logic for network failures
// FIXME: Race condition when multiple calls occur
// HACK: Temporary workaround until Puppeteer fixes this
```

---

## Testing Guidelines

### Test Structure

```typescript
import { LRUCache } from '../../src/utils/memoization';

describe('LRUCache', () => {
  // Group related tests
  describe('eviction', () => {
    it('should evict oldest entry when full', () => {
      const cache = new LRUCache<number, string>(2, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three'); // Evicts 1

      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);
      expect(cache.has(3)).toBe(true);
    });

    it('should update LRU order on access', () => {
      const cache = new LRUCache<number, string>(2, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.get(1); // Makes 1 most recent

      cache.set(3, 'three'); // Should evict 2, not 1

      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(false);
      expect(cache.has(3)).toBe(true);
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<number, string>(10, 50);

      cache.set(1, 'one');
      expect(cache.get(1)).toBe('one');

      await new Promise((r) => setTimeout(r, 100));

      expect(cache.get(1)).toBeUndefined();
    });
  });
});
```

### Test Best Practices

```typescript
// ✅ Use descriptive test names
it('should cache function results and return same value for same input', () => {
  // Test implementation
});

// ❌ Don't use vague names
it('works', () => {
  // Test implementation
});

// ✅ Test one thing per test
it('should evict oldest entry when cache is full', () => {
  // Test just eviction
});

// ❌ Don't test multiple things
it('should evict and track hits and handle errors', () => {
  // Too much in one test
});

// ✅ Use beforeEach for common setup
beforeEach(() => {
  cache = new LRUCache(10, 60000);
});

// ✅ Clean up resources
afterEach(async () => {
  await browser.close();
});

// ✅ Use real timers for async tests
beforeAll(() => {
  jest.useRealTimers();
});

// ✅ Use fake timers for sync timer tests
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

### Coverage Requirements

- **New features**: Must include tests
- **Bug fixes**: Must include regression test
- **Minimum coverage**: 80% for new code
- **Target coverage**: 100% for utils and core modules

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npm test -- tests/unit/memoization.test.ts

# With coverage
npm run test:coverage

# CI mode
npm run test:ci
```

---

## Pull Request Process

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added that prove fix/feature works
- [ ] Dependent changes merged

## Related Issues
Closes #123
```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline must pass
   - All tests must pass
   - No linting errors
   - Build must succeed

2. **Code Review**
   - At least one approval required
   - Address all reviewer comments
   - Keep discussions constructive

3. **Merge**
   - Squash and merge (preferred)
   - Merge commit for complex features
   - Delete branch after merge

### Getting Your PR Merged Faster

- ✅ Keep PRs small and focused
- ✅ Write clear descriptions
- ✅ Include tests
- ✅ Respond to reviews promptly
- ✅ Keep commits clean and logical
- ✅ Update documentation
- ❌ Don't include unrelated changes
- ❌ Don't mix refactoring with features

---

## Project Structure

```
undetect-browser/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD
├── dist/                   # Compiled output
├── docs/                   # Documentation
├── examples/               # Usage examples
│   ├── basic-usage.ts
│   ├── advanced-features-example.ts
│   └── performance-optimization-example.ts
├── src/
│   ├── core/              # Core stealth engine
│   │   ├── stealth-engine.ts
│   │   └── profile-manager.ts
│   ├── modules/           # Protection modules
│   │   ├── fingerprint-spoofing.ts
│   │   ├── network-protection.ts
│   │   └── viewport-protection.ts
│   ├── storage/           # Profile storage
│   │   └── profile-storage.ts
│   ├── types/             # TypeScript type definitions
│   │   └── browser-types.d.ts
│   ├── utils/             # Utility functions
│   │   ├── logger.ts
│   │   ├── memoization.ts
│   │   ├── performance.ts
│   │   ├── validators.ts
│   │   └── retry.ts
│   └── index.ts           # Main entry point
├── tests/
│   ├── unit/              # Unit tests
│   │   ├── memoization.test.ts
│   │   └── performance.test.ts
│   └── detection/         # Detection tests
├── CONTRIBUTING.md        # This file
├── LICENSE               # MIT License
├── README.md             # Russian documentation
├── README_EN.md          # English documentation
├── package.json
└── tsconfig.json
```

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite
4. Build and verify
5. Create release notes
6. Tag release
7. Push to npm

---

## Getting Help

- 💬 [GitHub Discussions](https://github.com/wpeva/new-undetect-browser/discussions)
- 🐛 [GitHub Issues](https://github.com/wpeva/new-undetect-browser/issues)
- 📧 Email: support@undetectbrowser.com

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<div align="center">

**Thank you for contributing to UndetectBrowser! 🎉**

</div>
