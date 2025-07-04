import userModel from '../../models/userModel.js';
import searchStrategy from './searchStrategy.js';

class statusSearchStrategy extends searchStrategy {

    async processSearch(userStatus) {
        if(typeof userStatus !== 'string'){
            throw new Error('Invalid userStatus input');
        }
    
        const result = await userModel.searchUsersByStatus(userStatus);
        return result;
    }
}

export default statusSearchStrategy;
