// Runs against a real in-memory MongoDB. Rotation correctness is entirely
// about what the database does under concurrency and replay, so mocking the
// store would assert nothing.
require('./setup');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(32);

jest.mock('../src/config/redis', () => ({
    getRedisOptional: jest.fn(() => null),
    getRedis: jest.fn(),
    connectRedis: jest.fn(),
}));

const User = require('../src/modules/user/User');
const RefreshToken = require('../src/modules/auth/RefreshToken');
const authService = require('../src/modules/auth/auth.service');

const credentials = {
    username: 'rotator',
    email: 'rotator@peernet.app',
    password: 'correct horse battery',
    fullName: 'Rot Ator',
};

describe('auth.service refresh rotation', () => {
    beforeEach(async () => {
        await authService.register(credentials);
    });

    const login = () => authService.login({ email: credentials.email, password: credentials.password });

    it('rotates a valid refresh token and revokes the old one', async () => {
        const { refreshToken } = await login();
        const rotated = await authService.refresh(refreshToken);

        expect(rotated.refreshToken).toBeTruthy();
        expect(rotated.refreshToken).not.toBe(refreshToken);
        expect(rotated.accessToken).toBeTruthy();
    });

    it('refuses a refresh token that has already been used', async () => {
        const { refreshToken } = await login();
        await authService.refresh(refreshToken);

        await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('revokes every session when a token is replayed', async () => {
        const first = await login();
        await login(); // a second, independent session

        // Three live tokens: the one register issued, plus one per login.
        expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(3);

        await authService.refresh(first.refreshToken);
        // Replay of the now-consumed token.
        await expect(authService.refresh(first.refreshToken)).rejects.toMatchObject({ statusCode: 401 });

        expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('lets exactly one of two concurrent refreshes win', async () => {
        const { refreshToken } = await login();

        const results = await Promise.allSettled([
            authService.refresh(refreshToken),
            authService.refresh(refreshToken),
        ]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        expect(fulfilled).toHaveLength(1);
    });

    it('refuses a token whose jti is unknown to this deployment', async () => {
        const { refreshToken } = await login();
        // Simulates Redis having been the store and having restarted, which is
        // the case the old implementation treated as valid.
        await RefreshToken.deleteMany({});

        await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('refuses to refresh a banned account', async () => {
        const { refreshToken } = await login();
        await User.updateOne({ email: credentials.email }, { status: 'banned' });

        await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('revokes the token on logout', async () => {
        const { refreshToken } = await login();
        await authService.logout(refreshToken);

        await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects a duplicate registration rather than raising a driver error', async () => {
        await expect(authService.register(credentials)).rejects.toMatchObject({ statusCode: 409 });
    });
});
