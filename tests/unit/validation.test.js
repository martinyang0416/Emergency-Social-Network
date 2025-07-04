import ValidationHelper from "../../utils/validationHelper.js";

describe('ValidationHelper', () => {
    // Define banned usernames
    const bannedUsernames = ['banneduser', 'admin', 'root'];

    // Username tests
    describe('validateUsername', () => {
        // Negative Tests
        it('should fail if username is shorter than 3 characters', async () => {
            const result = await ValidationHelper.validateUsername('ab', bannedUsernames);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Username must be at least 3 characters long.');
        });

        it('should fail if username is in the banned list', async () => {
            const result = await ValidationHelper.validateUsername('admin', bannedUsernames);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('This username is not allowed.');
        });

        it('should fail if username is in the banned list but with different case', async () => {
            const result = await ValidationHelper.validateUsername('ADMIN', bannedUsernames);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('This username is not allowed.');
        });

        // Positive Tests
        it('should pass if username is valid and not in the banned list', async () => {
            const result = await ValidationHelper.validateUsername('validUser', bannedUsernames);
            expect(result.valid).toBe(true);
        });

        it('should pass if username is exactly 3 characters long', async () => {
            const result = await ValidationHelper.validateUsername('abc', bannedUsernames);
            expect(result.valid).toBe(true);
        });

        it('should pass if username is longer than 3 characters and not in banned list', async () => {
            const result = await ValidationHelper.validateUsername('someValidUser', bannedUsernames);
            expect(result.valid).toBe(true);
        });
    });

    // Password tests
    describe('validatePassword', () => {
        // Negative Tests
        it('should fail if password is shorter than 4 characters', async () => {
            const result = await ValidationHelper.validatePassword('abc');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Password must be at least 4 characters long.');
        });

        // Positive Tests
        it('should pass if password is exactly 4 characters long', async () => {
            const result = await ValidationHelper.validatePassword('abcd');
            expect(result.valid).toBe(true);
        });

        it('should pass if password is at least 4 characters long', async () => {
            const result = await ValidationHelper.validatePassword('validPass123');
            expect(result.valid).toBe(true);
        });

        it('should pass if password contains uppercase and lowercase (case-sensitive)', async () => {
            const result = await ValidationHelper.validatePassword('Password123');
            expect(result.valid).toBe(true);
        });
    });
});
