import announcementSearchStrategy from "../service/searchControllerService/announcementSearchStrategy.js";
import privateMessageSearchStrategy from "../service/searchControllerService/privateMessageSearchStrategy.js";
import publicMessageSearchStrategy from "../service/searchControllerService/publicMessageSearchStrategy.js";
import usernameSearchStrategy from "../service/searchControllerService/usernameSearchstrategy.js";
import statusSearchStrategy from "../service/searchControllerService/statusSearchStrategy.js";
import userSearch from "../service/searchControllerService/userSearch.js";

class SearchController {
    static async postAmmouncementSearch(announcements, limit, offset) {
        const ammounceSearch = new announcementSearchStrategy();
        const search = new userSearch(ammounceSearch);
        search.setQuery(announcements);
        search.setLimit(limit);
        search.setOffset(offset);
        const result = await search.processSearch();

        // Transform the results to include only the required fields
        const formattedResult = result.map((item) => ({
            id: item.id,
            message_text: item.announcement_content,
            message_sent_time: item.announcement_sent_time,
            message_sender: item.announcement_sender,
            message_sender_status: item.announcement_sender_status,
        }));

        return formattedResult;
    }

    static async postPrivateMessageSearch(
        privateMessages,
        limit,
        offset,
        sender,
        recipient
    ) {
        const privateMessageSearch = new privateMessageSearchStrategy();
        const search = new userSearch(privateMessageSearch);
        search.setQuery(privateMessages);
        search.setLimit(limit);
        search.setOffset(offset);
        search.setSenderAndRecipient(sender, recipient);
        const { result, type } = await search.processSearch();

        let formattedResult = [];

        if (type === "returnUsers") {
            formattedResult = result.map((item) => ({
                id: item.id,
                username: item.user_name,
                citizenStatus: item.status,
                onlineStatus: item.online_status,
                statusTimestamp: item.status_timestamp,
            }));
        } else if (type === "returnMessages") {
            // Transform the results to include only the required fields
            formattedResult = result.map((item) => ({
                id: item.id,
                message_text: item.message_text,
                message_sent_time: item.message_sent_time,
                message_sender: item.message_sender,
                message_sender_status: item.message_sender_status,
            }));
        }

        return formattedResult;
    }

    static async postPublicMessageSearch(publicMessages, limit, offset) {
        const publicMessageSearch = new publicMessageSearchStrategy();
        const search = new userSearch(publicMessageSearch);
        search.setQuery(publicMessages);
        search.setLimit(limit);
        search.setOffset(offset);
        const result = await search.processSearch();

        // Transform the results to include only the required fields
        const formattedResult = result.map((item) => ({
            id: item.id,
            message_text: item.message_text,
            message_sent_time: item.message_sent_time,
            message_sender: item.message_sender,
            message_sender_status: item.message_sender_status,
        }));

        return formattedResult;
    }

    static async postUsernameSearch(username) {
        const usernameSearch = new usernameSearchStrategy();
        const search = new userSearch(usernameSearch);
        search.setQuery(username);
        return await search.processSearch();
    }

    static async postStatusSearch(userStatus) {
        try {
            const statusSearch = new statusSearchStrategy();
            const search = new userSearch(statusSearch);
            search.setQuery(userStatus);
            return await search.processSearch();
        } catch (error) {
            console.error("Error in postStatusSearch:", error);
            throw error;
        }
    }
}

export default SearchController;
