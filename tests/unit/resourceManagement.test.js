import resourceHelper from "../../public/js/utils/resourceHelper.js"


describe('validateQuantityInput', () => {
    // Test for valid quantities
    it('should return the quantity as an integer if it is valid (positive number)', () => {
        expect(resourceHelper.validateQuantity("10")).toBe(10); 
        expect(resourceHelper.validateQuantity(5)).toBe(5); 
    });

    // Test for invalid (negative) quantities
    it('should throw an error if the quantity is negative', () => {
        expect(() => resourceHelper.validateQuantity("-5")).toThrow("Quantity cannot be negative. Please enter a valid number.");
        expect(() => resourceHelper.validateQuantity(-10)).toThrow("Quantity cannot be negative. Please enter a valid number.");
    });

    // Test for invalid inputs (non-numeric values)
    it('should throw an error for non-numeric values', () => {
        expect(() => resourceHelper.validateQuantity("abc")).toThrow("Invalid quantity: must be a number.");
        expect(() => resourceHelper.validateQuantity(null)).toThrow("Invalid quantity: must be a number.");
        expect(() => resourceHelper.validateQuantity(undefined)).toThrow("Invalid quantity: must be a number.");
        expect(() => resourceHelper.validateQuantity({})).toThrow("Invalid quantity: must be a number.");
        expect(() => resourceHelper.validateQuantity([])).toThrow("Invalid quantity: must be a number.");
    });
});

describe('validateRequestFromUsername', () => {

    it('should throw an error if requester and requestedFrom usernames are the same', () => {
        const requesterUsername = 'john_doe';
        const requestedFromUsername = 'john_doe';
        expect(() => resourceHelper.validateRequestFromName(requesterUsername, requestedFromUsername)).toThrow("You cannot request resources from yourself.");
    });

    it('should not throw an error if requester and requestedFrom usernames are different', () => {
        const requesterUsername = 'john_doe';
        const requestedFromUsername = 'jane_smith';
        expect(() => resourceHelper.validateRequestFromName(requesterUsername, requestedFromUsername)).not.toThrow();
    });

    it('should handle case sensitivity', () => {
        const requesterUsername = 'John_Doe';
        const requestedFromUsername = 'john_doe';
        expect(() => resourceHelper.validateRequestFromName(requesterUsername, requestedFromUsername)).not.toThrow();
    });


});

describe("createSentRequestRows", () => {

    it("should create rows for requests with water", () => {
        const requests = [
            { request_id: 1, requested_from_username: "alice", water: 5, bread: 0, medicine: 0, status: "Pending" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("alice");
        expect(result).toContain("water");
        expect(result).toContain("5");
        expect(result).toContain("Pending");
    });

    it("should create rows for requests with bread", () => {
        const requests = [
            { request_id: 2, requested_from_username: "bob", water: 0, bread: 2, medicine: 0, status: "Approved" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("bob");
        expect(result).toContain("bread");
        expect(result).toContain("2");
        expect(result).toContain("Approved");
    });

    it("should create rows for requests with medicine", () => {
        const requests = [
            { request_id: 3, requested_from_username: "charlie", water: 0, bread: 0, medicine: 7, status: "Rejected" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("charlie");
        expect(result).toContain("medicine");
        expect(result).toContain("7");
        expect(result).toContain("Rejected");
    });

    it("should handle requests with mixed resource types", () => {
        const requests = [
            { request_id: 4, requested_from_username: "david", water: 0, bread: 0, medicine: 0, status: "Pending" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("david");
        expect(result).toContain("Pending");
    });

    it("should return 'No requests found' row for empty requests array", () => {
        const result = resourceHelper.createRequestRows([]);
        expect(result).toContain("No requests found");
    });

    it("should create rows for each request", () => {
        const requests = [
            { request_id: 1, requested_from_username: "alice", water: 5, bread: 0, medicine: 0, status: "Pending" },
            { request_id: 2, requested_from_username: "bob", water: 0, bread: 2, medicine: 2, status: "Approved" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("alice");
        expect(result).toContain("bob");
        expect(result).toContain("water");
        expect(result).toContain("bread");
        expect(result).toContain("Pending");
        expect(result).toContain("Approved");
    });

    it("should include the status when it is provided", () => {
        const requests = [
            { request_id: 1, requested_from_username: "alice", water: 5, bread: 0, medicine: 0, status: "Approved" },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("Approved"); // Check that the provided status is displayed
    });

    it("should default to 'Pending' when status is undefined", () => {
        const requests = [
            { request_id: 2, requested_from_username: "bob", water: 0, bread: 2, medicine: 0 },
        ];
        const result = resourceHelper.createRequestRows(requests);
        expect(result).toContain("Pending"); // Check that the default "Pending" is displayed
    });

});


describe("calculateTotalResources", () => {
    it("should return correct calculated totals for a list of users", () => {
        const resources = [
            { water: 5, bread: 10, medicine: 2 },
            { water: 3, bread: 0, medicine: 7 },
            { water: 0, bread: 5, medicine: 0 }
        ];

        const result = resourceHelper.calculateTotalResources(resources);

        expect(result).toEqual({ water: 8, bread: 15, medicine: 9 });
    });

    it("should handle missing values as 0", () => {
        const resources = [
            { water: 5 },
            { bread: 10 },
            { medicine: 3 }
        ];

        const result = resourceHelper.calculateTotalResources(resources);

        expect(result).toEqual({ water: 5, bread: 10, medicine: 3 });
    });

    it("should return 0 for empty resources list", () => {
        const result = resourceHelper.calculateTotalResources([]);
        expect(result).toEqual({ water: 0, bread: 0, medicine: 0 });
    });
});

