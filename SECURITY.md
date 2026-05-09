# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| `main`  | ✅ Active support  |

## Reporting a Vulnerability

**Please do NOT file a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in Notemind, please report it via one of the following:

- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/sayandeepdas02/Notemind/security/advisories/new)
- **Email**: security@notemind.app

### What to include

- Description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (if applicable)
- Any relevant logs, screenshots, or error messages
- Your suggested remediation (optional)

### What to expect

- **Acknowledgement** within 48 hours of submission
- **Status update** within 5 business days
- We will coordinate a fix and responsible disclosure timeline with you
- Credit will be given in the security advisory (unless you prefer anonymity)

## Security Best Practices for Contributors

- **Never commit secrets**: Real API keys, passwords, or tokens must never be committed. Use `.env.example` as your template and keep `.env` local.
- **Environment variables only**: All credentials must be read from the environment — never hardcoded.
- **Dependency hygiene**: Run `go mod tidy` and `npm audit` before submitting PRs.
- **Least privilege**: Request only the permissions your code actually needs.
- **Input validation**: Validate and sanitize all user input server-side.

## Automated Security Scanning

This repository has the following security measures enabled:

- **GitHub Secret Scanning** — automatically detects accidentally committed secrets
- **Dependabot** — automated dependency vulnerability alerts and PRs
- **golangci-lint** — catches common Go security anti-patterns in CI
- **ESLint** — catches common JS/TS security anti-patterns in CI
