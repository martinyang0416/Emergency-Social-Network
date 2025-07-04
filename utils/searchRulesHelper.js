class searchRulesHelper {
    static getSearchCriteria(criteria, query) {
        // Return empty criteria if the query is empty; otherwise, return the criteria in lowercase
        return query ? criteria.toLowerCase() : '';
    }
}
export default searchRulesHelper;