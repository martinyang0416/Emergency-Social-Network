class userSearch{

    constructor(searchStrategy){
        this.searchStrategy = searchStrategy;
        this.limit = 10;
        this.offset = 0;
        this.query = '';
        this.sender = '';
        this.recipient = '';
    }

    setQuery(query){
        this.query = query;
    }
    
    setLimit(limit){
        this.limit = limit;
    }

    setOffset(offset){
        this.offset = offset;
    }

    setSenderAndRecipient(sender, recipient){
        this.sender = sender;
        this.recipient = recipient;
    }

    async processSearch() {
        const string = this.query;
        console.log('UserSearch processSearch called with:', string);
        try {
          switch (this.searchStrategy.constructor.name) {
            case 'announcementSearchStrategy':
                return await this.searchStrategy.processSearch(string, this.limit, this.offset);
            case 'privateMessageSearchStrategy':
                return await this.searchStrategy.processSearch(string, this.limit, this.offset, this.sender, this.recipient);
            case 'publicMessageSearchStrategy':
                return await this.searchStrategy.processSearch(string, this.limit, this.offset);
            case 'usernameSearchStrategy':
                return await this.searchStrategy.processSearch(string);
            case 'statusSearchStrategy':
                return await this.searchStrategy.processSearch(string);
            default:
                return await this.searchStrategy.processSearch(string);
          }
        }
        catch(error) {
            console.error('Error in userSearch:', error);
            throw error;
        }
    }
}

export default userSearch;