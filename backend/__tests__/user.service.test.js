const mongoose = require('mongoose');
const { getProfile } = require('../src/services/user.service');
const User = require('../src/models/User');

// Mock Redis
jest.mock('../src/config/redis', () => ({
    getRedis: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
    }),
}));

describe('User Service', () => {
    let mockUser;

    beforeEach(async () => {
        mockUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            fullName: 'Test User',
            passwordHash: 'hashedpassword',
        });
    });

    describe('getProfile', () => {
        it('should return a user profile without passwordHash', async () => {
            const profile = await getProfile(mockUser._id);
            expect(profile).toBeDefined();
            expect(profile.username).toBe('testuser');
            expect(profile.passwordHash).toBeUndefined();
        });

        it('should throw 404 if user not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(getProfile(fakeId)).rejects.toThrow('User not found');
        });
    });
});
