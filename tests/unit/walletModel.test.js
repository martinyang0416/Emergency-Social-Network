import WalletController from '../../controllers/walletController.js';
import WalletModel from '../../models/walletModel.js';

jest.mock('../../models/walletModel.js', () => ({
    getUserBalance: jest.fn(),
    addCard: jest.fn(),
    getUserCards: jest.fn(),
    deleteCard: jest.fn(),
    getCardByNumber: jest.fn(),
    getTransactionsByUsername: jest.fn(),
    getTransactionsByUser: jest.fn(),
}));

describe('WalletController Tests', () => {
    const mockRes = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getBalance', () => {
        it('should return the user\'s balance when the wallet exists', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockResolvedValue(500);

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ balance: 500 });
        });

        it('should return 404 if the wallet does not exist', async () => {
            const req = { params: { username: 'nonexistentUser' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockResolvedValue(null);

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Wallet not found' });
        });

        it('should return 500 if an error occurs', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockRejectedValue(new Error('Database error'));

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error fetching balance',
                error: 'Database error',
            });
        });
    });

    describe('addCard', () => {
        it('should add a card successfully', async () => {
            const req = { body: { username: 'testUser', cardNumber: '1234567890123456', holderName: 'John Doe', expire_month: 12, expire_year: 2025, cvv: 123 } };
            const res = mockRes();

            WalletModel.addCard.mockResolvedValue({ insertId: 1 });

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Card added successfully',
                cardId: 1,
            });
        });

        it('should return 409 if the card already exists', async () => {
            const req = { body: { username: 'testUser', cardNumber: '1234567890123456', holderName: 'John Doe', expire_month: 12, expire_year: 2025, cvv: 123 } };
            const res = mockRes();

            WalletModel.addCard.mockRejectedValue(new Error('Card already exists for this user'));

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Card already exists for this user',
            });
        });

        it('should return 500 if an error occurs', async () => {
            const req = { body: { username: 'testUser', cardNumber: '1234567890123456', holderName: 'John Doe', expire_month: 12, expire_year: 2025, cvv: 123 } };
            const res = mockRes();

            WalletModel.addCard.mockRejectedValue(new Error('Database error'));

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error adding card',
                error: 'Database error',
            });
        });
    });

    describe('getCards', () => {
        it('should return all cards for a user', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();
            const mockCards = [
                { card_number: '1234567812345678', card_holder: 'John Doe', expire_month: 12, expire_year: 2025 },
            ];

            WalletModel.getUserCards.mockResolvedValue(mockCards);

            await WalletController.getCards(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockCards);
        });

        it('should return 500 if an error occurs', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getUserCards.mockRejectedValue(new Error('Database error'));

            await WalletController.getCards(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error fetching cards',
                error: 'Database error',
            });
        });
    });

    describe('removeCard', () => {
        it('should remove a card successfully', async () => {
            const req = { params: { cardNumber: '1234567812345678' }, user: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getCardByNumber.mockResolvedValue({ card_number: '1234567812345678' });
            WalletModel.deleteCard.mockResolvedValue();

            await WalletController.removeCard(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Card removed successfully' });
        });

        it('should return 404 if the card does not exist', async () => {
            const req = { params: { cardNumber: '1234567812345678' }, user: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getCardByNumber.mockResolvedValue(null);

            await WalletController.removeCard(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Card not found' });
        });

        it('should return 500 if an error occurs', async () => {
            const req = { params: { cardNumber: '1234567812345678' }, user: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getCardByNumber.mockRejectedValue(new Error('Database error'));

            await WalletController.removeCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to remove card',
                error: 'Database error',
            });
        });
    });

    describe('Additional Tests', () => {
        it('should handle empty username gracefully in getBalance', async () => {
            const req = { params: { username: '' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockResolvedValue(null);

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Wallet not found' });
        });

        it('should handle invalid card number in addCard', async () => {
            const req = { body: { username: 'testUser', cardNumber: 'invalidCard', holderName: 'John Doe', expire_month: 12, expire_year: 2025, cvv: 123 } };
            const res = mockRes();

            WalletModel.addCard.mockRejectedValue(new Error('Invalid card number'));

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error adding card',
                error: 'Invalid card number',
            });
        });
    });

    describe('getBalance', () => {
        it('should handle non-existing username gracefully', async () => {
            const req = { params: { username: 'nonexistentUser' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockResolvedValue(null);

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Wallet not found' });
        });

        it('should handle database errors when fetching balance', async () => {
            const req = { params: { username: 'errorUser' } };
            const res = mockRes();

            WalletModel.getUserBalance.mockRejectedValue(new Error('Database error'));

            await WalletController.getBalance(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error fetching balance',
                error: 'Database error',
            });
        });
    });

    describe('addCard', () => {
        it('should handle invalid card numbers gracefully', async () => {
            const req = {
                body: {
                    username: 'testUser',
                    cardNumber: 'invalidCard123',
                    holderName: 'John Doe',
                    expire_month: '12',
                    expire_year: '2030',
                    cvv: '123',
                },
            };
            const res = mockRes();

            WalletModel.addCard.mockResolvedValue();

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500); // Treating it as invalid input
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error adding card',
                error: expect.any(String),
            });
        });

        it('should handle missing card details', async () => {
            const req = {
                body: {
                    username: 'testUser',
                    cardNumber: '',
                    holderName: '',
                    expire_month: '12',
                    expire_year: '',
                    cvv: '123',
                },
            };
            const res = mockRes();

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error adding card',
                error: expect.any(String),
            });
        });

        it('should reject adding a card with duplicate details', async () => {
            const req = {
                body: {
                    username: 'testUser',
                    cardNumber: '1234567812345678',
                    holderName: 'John Doe',
                    expire_month: '12',
                    expire_year: '2030',
                    cvv: '123',
                },
            };
            const res = mockRes();

            WalletModel.addCard.mockRejectedValue(new Error('Card already exists for this user'));

            await WalletController.addCard(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Card already exists for this user',
            });
        });
    });

    describe('getCards', () => {
        it('should return an empty list if no cards are found', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getUserCards.mockResolvedValue([]);

            await WalletController.getCards(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe('removeCard', () => {
        it('should handle card removal when the card does not exist', async () => {
            const req = { params: { cardNumber: '1234567812345678' }, user: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getCardByNumber.mockResolvedValue(null);

            await WalletController.removeCard(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Card not found' });
        });

        it('should return an error if the database fails during card removal', async () => {
            const req = { params: { cardNumber: '1234567812345678' }, user: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getCardByNumber.mockResolvedValue({ card_number: '1234567812345678' });
            WalletModel.deleteCard.mockRejectedValue(new Error('Database error'));

            await WalletController.removeCard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to remove card',
                error: 'Database error',
            });
        });
    });

    describe('getStatistics', () => {
        it('should handle no transactions gracefully', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getTransactionsByUser.mockResolvedValue([]);

            await WalletController.getStatistics(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                moneyIn: 0,
                moneyOut: 0,
            });
        });

        it('should handle transactions correctly', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getTransactionsByUser.mockResolvedValue([
                { sender: 'testUser', receiver: 'user1', amount: 100 },
                { sender: 'user2', receiver: 'testUser', amount: 50 },
            ]);

            await WalletController.getStatistics(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                moneyIn: 50,
                moneyOut: 100,
            });
        });

        it('should return an error if statistics calculation fails', async () => {
            const req = { params: { username: 'testUser' } };
            const res = mockRes();

            WalletModel.getTransactionsByUser.mockRejectedValue(new Error('Database error'));

            await WalletController.getStatistics(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch statistics',
            });
        });
    });

    describe('processDonation', () => {
        it('should process a donation successfully', async () => {
            const req = {
                body: { sender: 'user1', receiver: 'user2', amount: 50 },
            };
            const res = mockRes();

            // Ensure mocks are defined
            WalletModel.getUserBalance = jest.fn().mockResolvedValue(100);
            WalletModel.updateBalance = jest.fn().mockResolvedValue();
            WalletModel.updateTrascation = jest.fn().mockResolvedValue();

            await WalletController.processDonation(req, res);

            expect(WalletModel.getUserBalance).toHaveBeenCalledWith('user1');
            expect(WalletModel.updateBalance).toHaveBeenCalledTimes(2); // Once for sender, once for receiver
            expect(WalletModel.updateTrascation).toHaveBeenCalledWith('user1', 50, 'user2');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Donation successful' });
        });

        it('should reject donations if sender balance is insufficient', async () => {
            const req = {
                body: { sender: 'user1', receiver: 'user2', amount: 150 },
            };
            const res = mockRes();

            WalletModel.getUserBalance = jest.fn().mockResolvedValue(100);

            await WalletController.processDonation(req, res);

            expect(WalletModel.getUserBalance).toHaveBeenCalledWith('user1');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Insufficient balance',
            });
        });

        it('should handle database errors gracefully during donation', async () => {
            const req = {
                body: { sender: 'user1', receiver: 'user2', amount: 50 },
            };
            const res = mockRes();

            WalletModel.getUserBalance = jest.fn().mockResolvedValue(100);
            WalletModel.updateBalance = jest.fn().mockRejectedValue(new Error('Database error'));

            await WalletController.processDonation(req, res);

            expect(WalletModel.updateBalance).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to process donation',
            });
        });
    });
});