# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ (Active) |
| < 1.0   | ❌ (Deprecated) |

## Reporting a Vulnerability

If you discover a security vulnerability in PeerNet, please **do not open a public issue**.

Instead, report it privately:

**Email:** syedmukheeth@gmail.com  
**LinkedIn:** [linkedin.com/in/syedmukheeth](https://www.linkedin.com/in/syedmukheeth/)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

### Response Timeline

- **Acknowledgement:** Within 24-48 hours
- **Status Update:** Weekly until resolved
- **Fix/Patch:** Prioritized based on severity (Critical/High/Medium)

## Security Best Practices Used

- **JWT Authentication**: Secure stateless authentication with short-lived access tokens and rotated refresh tokens.
- **Role-Based Access Control (RBAC)**: Strict access levels for Users, Moderation, and Global Administrators.
- **Rate Limiting**: Intelligent throttling on sensitive endpoints (Login, Register, Stories) to prevent brute-force attacks.
- **Input Sanitization**: Multi-layer protection against NoSQL injection and XSS (Cross-Site Scripting).
- **CORS Management**: Strict origin filtering to prevent unauthorized cross-domain requests.
- **Socket Security**: Authenticated websocket handshakes for secure real-time messaging.
- **Asset Integrity**: Cloudinary signed uploads and delivery for media security.
- HTTPS enforced in production

## If Credentials Were Leaked (e.g. in Git History)

1. **Purge from history**  
   Use `git filter-repo` (preferred) or `git filter-branch` to rewrite history and remove the secret from all commits. Do not interrupt the process.

2. **Rotate credentials immediately**  
   Treat the leaked value as compromised. In MongoDB Atlas: change the database user password (or create a new user and delete the old one). Update `MONGO_URI` in `.env` and in any deployment/config (e.g. Render) with the new credentials.

3. **Update remote history**  
   After rewriting history: `git push --force --all` and `git push --force --tags`. Collaborators should re-clone or hard-reset to the new history.

4. **Prevent future leaks**  
   Never commit `.env` (it is in `.gitignore`). Use `.env.example` with placeholders only. Consider a pre-commit or CI check that blocks commits containing connection strings or other secrets.

---

Built by **Syed Mukheeth** · © 2026

