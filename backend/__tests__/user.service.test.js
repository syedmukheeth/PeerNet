const User = require('../src/modules/user/User');
const Follower = require('../src/modules/user/Follower');
const { getRedis } = require('../src/config/redis');
const { getProfile } = require('../src/modules/user/user.service');

jest.mock('../src/modules/user/User', () => ({
    findById: jest.fn(),
}));

jest.mock('../src/modules/user/Follower', () => ({
    findOne: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
    getRedis: jest.fn(),
}));

jest.mock('../src/config/kafka', () => ({
    publishEvent: jest.fn(),
}));

jest.mock('../src/modules/notification/notification.service', () => ({
    createNotification: jest.fn(),
}));

describe('user.service/getProfile', () => {
    let redisMock;

    beforeEach(() => {
        redisMock = {
            get: jest.fn().mockResolvedValue(null),
            setEx: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };
        getRedis.mockReturnValue(redisMock);
        Follower.findOne.mockResolvedValue(null);
    });

    it('returns profile without passwordHash and adds isFollowing', async () => {
        const userDoc = {
            toJSON: () => ({
                _id: 'user_1',
                username: 'testuser',
                passwordHash: undefined,
            }),
        };
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(userDoc),
        });

        const profile = await getProfile('user_1', 'requester_1');

        expect(User.findById).toHaveBeenCalledWith('user_1');
        expect(Follower.findOne).toHaveBeenCalledWith({ follower: 'requester_1', following: 'user_1' });
        expect(redisMock.setEx).toHaveBeenCalled();
        expect(profile.username).toBe('testuser');
        expect(profile.passwordHash).toBeUndefined();
        expect(profile.isFollowing).toBe(false);
    });

    it('throws when user is not found', async () => {
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });

        await expect(getProfile('missing_user')).rejects.toThrow('User not found');
    });
});
