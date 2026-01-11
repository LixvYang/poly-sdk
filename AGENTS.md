# AGENTS.md - Development Guidelines for @lixvyang/poly-sdk

This file provides development guidelines for agents working on this TypeScript SDK for Polymarket prediction markets.

## Build & Development Commands

This project uses `pnpm` as the package manager and follows a TypeScript-first approach.

### Core Commands
```bash
# Install dependencies
pnpm install

# Build the project (TypeScript compilation)
pnpm run build          # Outputs to ./dist
pnpm run dev            # Watch mode for development

# Testing
pnpm test               # Run all unit tests
pnpm test:watch         # Unit tests in watch mode  
pnpm test:integration   # Run integration tests only

# Examples (for testing functionality)
pnpm example:basic
pnpm example:trading
pnpm example:realtime
# ... many more examples available
```

### Running Single Tests
```bash
# Single unit test file
pnpm test -- src/services/trading-service.test.ts

# Single integration test  
pnpm test:integration -- src/__tests__/integration/trading-service.integration.test.ts
```

### Test Configuration
- **Unit Tests**: `vitest.config.ts` - 30s timeout, exclude integration tests
- **Integration Tests**: `vitest.integration.config.ts` - 60s timeout, real API calls
- Test files follow pattern: `*.test.ts` (unit) or `*.integration.test.ts` (integration)

## Project Architecture

### Directory Structure
```
src/
├── core/                 # Core infrastructure (rate limiting, cache, errors, types)
├── clients/              # Low-level API clients (data-api, gamma-api, subgraph, ctf, bridge)
├── services/             # High-level services (trading, markets, wallet, smart-money, arbitrage)
├── utils/                # Utility functions (price calculations)
├── __tests__/           # Integration tests only
└── index.ts             # Main entry point and SDK class
```

### Key Components
- **Rate Limiter**: Centralized API rate limiting across all clients
- **Unified Cache**: Abstraction layer supporting legacy Cache and CacheAdapter
- **Error Handling**: Custom PolymarketError with structured error codes
- **Trading Service**: Main trading interface with orderbook access
- **Real-time Service**: WebSocket integration via official @polymarket/real-time-data-client

## Code Style Guidelines

### Import Patterns
```typescript
// Named imports with explicit .js extensions (ESM)
import { RateLimiter } from './core/rate-limiter.js';
import { DataApiClient } from './clients/data-api.js';

// Type imports should be explicitly marked
import type { UnifiedMarket, ProcessedOrderbook } from './core/types.js';
```

### Naming Conventions
- **Files**: kebab-case (`trading-service.ts`, `price-utils.ts`)
- **Classes**: PascalCase (`PolymarketSDK`, `TradingService`)
- **Functions/Variables**: camelCase (`getMarket`, `detectArbitrage`)
- **Types**: PascalCase with descriptive names (`ArbitrageOpportunity`, `MarketToken`)
- **Constants**: UPPER_SNAKE_CASE (`CACHE_TTL`, `ROUNDING_CONFIG`)

### TypeScript Standards
- **Target**: ES2020, Module: ES2022 with bundler resolution
- **Strict Mode**: Enabled with declarations and source maps
- **Module System**: ESM only (type: "module" in package.json)
- **Explicit Types**: Always provide return types for public APIs
- **Type Exports**: Separate type exports from value exports in main index

### Error Handling
```typescript
// Use custom error types with error codes
throw new PolymarketError(ErrorCode.NETETWORK_ERROR, 'Connection failed');

// Retry logic with exponential backoff
const result = await withRetry(() => apiCall(), { maxRetries: 3 });
```

### Documentation Style
- **JSDoc Comments**: Use comprehensive JSDoc with examples
- **Inline Comments**: Chinese comments allowed for complex algorithms
- **Deprecation**: Use @deprecated with clear migration paths
- **Examples**: Include code examples in public method documentation

### Interface Design
- **Small Interfaces**: Follow interface segregation principle
- **Union Types**: Use string unions for constants (`'BUY' | 'SELL'`)
- **Optional Properties**: Use optional syntax rather than undefined unions
- **Readonly**: Use readonly for immutable data structures

## Development Patterns

### Service Initialization
```typescript
// Services require async initialization for API setup
const service = new TradingService(rateLimiter, cache, config);
await service.initialize();
```

### WebSocket Connection
```typescript
// Real-time services need explicit connection management
realtimeService.connect();
await realtimeService.waitForConnection(10000);
```

### Cache Usage
```typescript
// Always use unified cache abstraction
const cache = createUnifiedCache(config.cache);
cache.get(key, () => fetchData());
```

### Rate Limiting
```typescript
// All API calls should go through rate limiter
await rateLimiter.execute('API_TYPE', async () => {
  return apiClient.fetchData();
});
```

## Testing Guidelines

### Unit Tests
- Co-locate with source files: `src/service.ts` → `src/service.test.ts`
- Mock external APIs using vi.mock()
- Use describe/it/expect patterns with clear test descriptions
- Test both success and error paths

### Integration Tests
- Place in `src/__tests__/integration/`
- Use real API endpoints with test data
- Include longer timeouts (60s for integration tests)
- Use beforeAll/afterAll for setup/teardown

### Test Patterns
```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('ServiceName', () => {
  let service: ServiceType;
  
  beforeAll(async () => {
    service = new ServiceType();
    await service.initialize();
  });

  it('should handle success case', async () => {
    const result = await service.method();
    expect(result).toBeDefined();
  });
});
```

## Common Gotchas

### Module Resolution
- Always include `.js` extensions in imports (even for .ts files)
- Use bundler module resolution for TypeScript config

### Private Keys
- Never hardcode private keys in tests
- Use dummy keys (`'0x' + '1'.repeat(64)`) for read-only operations
- Environment variables for real keys in integration tests

### WebSocket Management
- Always disconnect services in cleanup
- Use waitForConnection() before sending data
- Handle connection failures gracefully

### Price Calculations
- Use price-utils for all financial calculations
- Apply proper rounding with ROUNDING_CONFIG
- Handle floating-point precision carefully

## Release Process

The project includes automated publishing via `./scripts/publish.sh`. The main SDK class is `PolymarketSDK` in `src/index.ts` and should be the primary entry point for users.

When making changes:
1. Run `pnpm run build` to ensure TypeScript compilation succeeds
2. Run `pnpm test` for unit tests
3. Run `pnpm test:integration` for integration tests
4. Update examples if API changes are made
5. Consider backward compatibility for public APIs