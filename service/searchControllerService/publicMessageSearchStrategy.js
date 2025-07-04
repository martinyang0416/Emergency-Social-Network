import searchStrategy from './searchStrategy.js';
import messageModel from '../../models/messageModel.js';
class publicMessageSearchStrategy extends searchStrategy{
    async processSearch(wordList, limit, offset) {

        // Check if wordList is a string and convert it to an array
        if (typeof wordList === 'string') {
            wordList = wordList.split(' ').filter(word => word.trim() !== ''); // Split by spaces and remove empty entries
        }

        if(typeof wordList !== 'object' || !Array.isArray(wordList)){
            throw new Error('Invalid word list');
        }

        // Fetch announcements using a single call with all words
        const announcements = await messageModel.searchMessagesBywords(wordList);
    
        // Return paginated results
        return announcements.slice(offset, offset + limit);
    }  
}
export default publicMessageSearchStrategy;