const postService = require('../src/modules/post/post.service');
const postController = require('../src/modules/post/post.controller');

jest.mock('../src/modules/post/post.service', () => ({
    getPost: jest.fn(),
}));

jest.mock('../src/modules/feed/feed.service', () => ({
    getFeed: jest.fn(),
}));

describe('post.controller/getPost', () => {
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        next = jest.fn();
        postService.getPost.mockResolvedValue({ _id: 'post_1', isLiked: false, isSaved: false });
    });

    // The route sits behind optionalAuth, so req.user is absent for a logged out
    // visitor opening a shared link. Reading req.user._id here used to throw a
    // TypeError and turn every anonymous post view into a 500.
    it('serves an anonymous request with no viewer id', async () => {
        const req = { params: { id: 'post_1' } };

        await postController.getPost(req, res, next);

        expect(postService.getPost).toHaveBeenCalledWith('post_1', undefined);
        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { _id: 'post_1', isLiked: false, isSaved: false },
        });
    });

    it('passes the viewer id through when the request is authenticated', async () => {
        const req = { params: { id: 'post_1' }, user: { _id: 'user_1' } };

        await postController.getPost(req, res, next);

        expect(postService.getPost).toHaveBeenCalledWith('post_1', 'user_1');
        expect(next).not.toHaveBeenCalled();
    });

    it('forwards service errors to the error handler', async () => {
        const err = new Error('Post not found');
        postService.getPost.mockRejectedValue(err);

        await postController.getPost({ params: { id: 'missing' } }, res, next);

        expect(next).toHaveBeenCalledWith(err);
        expect(res.json).not.toHaveBeenCalled();
    });
});
