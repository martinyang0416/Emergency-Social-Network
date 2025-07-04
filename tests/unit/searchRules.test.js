import searchRulesHelper from "../../utils/searchRulesHelper.js";

describe('getSearchCriteria', () => {

    it('should return empty criteria if query is empty for "name"', () => {
        const result = searchRulesHelper.getSearchCriteria('name', '');
        expect(result).toBe('');
    });

    it('should return empty criteria if query is empty for "status"', () => {
        const result = searchRulesHelper.getSearchCriteria('status', '');
        expect(result).toBe('');
    });

    it('should return empty criteria if query is empty for "announcements"', () => {
        const result = searchRulesHelper.getSearchCriteria('announcements', '');
        expect(result).toBe('');
    });

    it('should return empty criteria if query is empty for "publicmessages"', () => {
        const result = searchRulesHelper.getSearchCriteria('publicmessages', '');
        expect(result).toBe('');
    });

    it('should return empty criteria if query is empty for "privatemessages"', () => {
        const result = searchRulesHelper.getSearchCriteria('privatemessages', '');
        expect(result).toBe('');
    });

    // Non-empty query tests
    it('should return "name" criteria if query is non-empty', () => {
        const result = searchRulesHelper.getSearchCriteria('name', 'testUser');
        expect(result).toBe('name');
    });

    it('should return "status" criteria if query is non-empty', () => {
        const result = searchRulesHelper.getSearchCriteria('status', 'active');
        expect(result).toBe('status');
    });

    it('should return "announcements" criteria if query is non-empty', () => {
        const result = searchRulesHelper.getSearchCriteria('announcements', 'feature');
        expect(result).toBe('announcements');
    });

    it('should return "publicmessages" criteria if query is non-empty', () => {
        const result = searchRulesHelper.getSearchCriteria('publicmessages', 'hello');
        expect(result).toBe('publicmessages');
    });

    it('should return "privatemessages" criteria if query is non-empty', () => {
        const result = searchRulesHelper.getSearchCriteria('privatemessages', 'hello');
        expect(result).toBe('privatemessages');
    });
});