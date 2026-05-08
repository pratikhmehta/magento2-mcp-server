# Security Policy

## Supported Versions

Only the latest version of the Magento 2 MCP Server is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take the security of this project seriously. If you believe you have found a security vulnerability, please do NOT report it via a public issue.

Instead, please report it through one of the following channels:

1.  **Private Disclosure**: Use GitHub's [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-post-vulnerability-disclosure/about-reporting-a-vulnerability-to-a-repository-owner) feature.
2.  **Generic Contact**: Contact the repository owner directly through GitHub.

### What to include in your report:

- A descriptive title of the vulnerability.
- Steps to reproduce the issue (PoC).
- Potential impact and severity.
- Any suggested mitigations.

We will acknowledge receipt of your report within 48 hours and provide a timeline for resolution.

## Security Features in this Repository

- **Automated VAPT**: Every push is scanned via CodeQL, TruffleHog, and `npm audit`.
- **Environment Isolation**: Sensitive credentials are never stored in the codebase; we use `.env` files (git-ignored) and `.env.example` templates.
- **Rate Limiting**: Built-in protection against API abuse.
