
class searchStrategy {

    async processSearch(string) {
        throw new Error('processSearch() must be implemented by subclasses');
    }

    async processSearch(wordList, limit, offset) {
        throw new Error('processSearch() must be implemented by subclasses');
    }
}

export default searchStrategy;
