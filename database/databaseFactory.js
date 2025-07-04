// DatabaseFactory.js
class DatabaseFactory {
    static getConnection(type) {
        if (type === 'production') {
            return new ProductionDatabaseConnection();
        } else if (type === 'test') {
            return new TestDatabaseConnection();
        }
    }
}
