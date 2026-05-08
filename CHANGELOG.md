# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-04-24

### Added
- **Frontend React 19** with TypeScript
- **Backend Express** with MySQL
- **Multi-tenant system** with subdomains
- **Authentication** with JWT + Refresh Tokens
- **2FA support** with TOTP

### Features
- Full evaluation form (pre, during, post encounter)
- Star rating system (1-5)
- QR Code generation for sharing
- PDF preview of evaluations
- Auto-save draft functionality
- Progress indicator in forms
- CSV/JSON export
- Statistics dashboard
- Dark mode support
- Pagination and filters

### Testing
- Unit tests for validators, auth, utils
- Integration test files (require supertest)
- E2E Playwright tests (login, evaluation, admin, password recovery)

### Documentation
- OpenAPI 3.0 specification
- README with API documentation
- CHANGELOG

### Security
- Rate limiting
- HTTP-only cookies
- CSRF protection
- Password strength validation
- Audit logging

---

## [0.0.0] - 2024-01-01

### Added
- Initial SQLite-based version
- Basic evaluation form
- Admin interface
- Statistics