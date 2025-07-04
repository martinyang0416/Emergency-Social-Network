import authMiddleware from '../../middlewares/authMiddleware.js';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            render: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should proceed to the next middleware if token is valid', () => {
        const mockUser = { username: 'testUser' };
        req.headers['authorization'] = 'Bearer valid_token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, mockUser);
        });

        authMiddleware(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET, expect.any(Function));
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token is missing', () => {
        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Access denied, token missing!' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', () => {
        req.headers['authorization'] = 'Bearer invalid_token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid token'), null);
        });

        authMiddleware(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('invalid_token', process.env.JWT_SECRET, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Invalid or expired token!' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is expired', () => {
        req.headers['authorization'] = 'Bearer expired_token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('TokenExpiredError'), null);
        });

        authMiddleware(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('expired_token', process.env.JWT_SECRET, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Invalid or expired token!' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is malformed', () => {
        req.headers['authorization'] = 'Bearer'; // Malformed token

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.render).toHaveBeenCalledWith('error', { message: 'Access denied, token missing!' });
        expect(next).not.toHaveBeenCalled();
    });
});
