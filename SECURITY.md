# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ |
| < 1.0   | ❌ |

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

- **Acknowledgement:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix/Patch:** As soon as possible depending on severity

## Security Best Practices Used

- JWT authentication with refresh tokens
- Rate limiting on all API endpoints
- Input sanitization (NoSQL injection protection)
- CORS restrictions
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

