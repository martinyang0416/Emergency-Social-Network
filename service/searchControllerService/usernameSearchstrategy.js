import searchStrategy from './searchStrategy.js';
import userModel from '../../models/userModel.js';

class usernameSearchStrategy extends searchStrategy{
    async processSearch(userName) {
        if(typeof userName !== 'string'){
            throw new Error('Invalid userName input');
        }

        const result = await userModel.searchUsersByUsername(userName);
        return result;
    }
}
export default usernameSearchStrategy;