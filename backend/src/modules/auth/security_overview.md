# PeerNet Security Architecture Overview

This document provides a technical breakdown of the security decisions and implementation details for the PeerNet authentication system.

## 1. Password Security (Hashing)
- **Algorithm**: `bcryptjs` (Blowfish-based hashing).
- **Salt Rounds**: 12 (Balance between high cost for attackers and acceptable latency for users).
- **Security Benefit**: Protects user passwords in the event of a database breach. Since Bcrypt is intentionally slow and incorporates a salt, it is resistant to rainbow table and brute-force attacks.

## 2. JWT Strategy (Access & Refresh Tokens)
PeerNet uses a dual-token strategy to balance usability and security.

### Access Token
- **Location**: Returned in JSON response body.
- **Lifespan**: Short (15 minutes).
- **Payload**: Contains `userId` and `role` for role-based access control.
- **Workflow**: Sent in the `Authorization: Bearer <token>` header forทุก API request.

### Refresh Token (Rotation)
- **Location**: Stored in a **HttpOnly, Secure** cookie.
- **Lifespan**: Long (7 days).
- **Security Features**:
    - **HttpOnly**: Inaccessible to client-side JavaScript, mitigating XSS (Cross-Site Scripting) attacks.
    - **Secure**: Only transmitted over HTTPS (in production).
    - **Rotation**: Every time a new Access Token is requested, a new Refresh Token is also issued, and the old one is blacklisted.
    - **Blacklisting**: Managed via Redis (with an in-memory Map fallback). Reusing an old refresh token will trigger a security fail.

## 3. Role-Based Access Control (RBAC)
PeerNet enforces granular authorization using middleware.
- **`authenticate` middleware**: Verifies the Access Token and attaches the `User` object to `req.user`.
- **`requireAdmin` middleware**: Checks the `role` field on `req.user`. If the role is not `admin`, Access is denied with a `403 Forbidden` status.

**Example Usage**:
```javascript
router.delete('/posts/:id', authenticate, requireAdmin, postController.deletePost);
```

## 4. Rate Limiting (Anti-Brute Force)
To prevent automated credential stuffing and brute-force attacks, we apply specific limits to auth endpoints.
- **`authLimiter`**: Restricts a single IP to 10 authentication attempts every 15 minutes.
- **Configuration**: Uses `express-rate-limit`.

## 5. Input Validation
- **Library**: `Joi`.
- **Schema**: Enforces strong password requirements (minimum 8 chars, mixed case, numbers, special characters) and sanitizes inputs to prevent NoSQL injection.

## 6. Secure Defaults
- **Verification**: New users are NOT verified by default, preventing impersonation.
- **Guest Access**: Temporary accounts are restricted and have their own distinct logic.
- **Middleware**: Uses `helmet` for security headers and `mongo-sanitize` to clean request data.
