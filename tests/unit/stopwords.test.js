import stopwordsHelper from "../../utils/stopwordsHelper.js";

describe("stopwordsHelper", () => {
    // Tests for isStopWord
    describe("isStopWord", () => {
        // Negative Tests
        it("should return false when the word is not a stop word", () => {
            const result = stopwordsHelper.isStopWord("computer");
            expect(result).toBe(false);
        });

        it("should return false for an empty string", () => {
            const result = stopwordsHelper.isStopWord("");
            expect(result).toBe(false);
        });

        it("should return false for a word with leading/trailing spaces", () => {
            const result = stopwordsHelper.isStopWord(" the ");
            expect(result).toBe(false);
        });

        // Positive Tests
        it("should return true when the word is a stop word", () => {
            const result = stopwordsHelper.isStopWord("the");
            expect(result).toBe(true);
        });

        it("should return true regardless of the case", () => {
            const result = stopwordsHelper.isStopWord("ThE");
            expect(result).toBe(true);
        });
    });

    // Tests for hasOnlyStopWords
    describe("hasOnlyStopWords", () => {
        // Positive Tests
        it("should return true if the sentence consists only stop words", () => {
            const result = stopwordsHelper.hasOnlyStopWords("a the and");
            expect(result).toBe(true);
        });

        it("should return true if the sentence contains stop words with different cases", () => {
            const result = stopwordsHelper.hasOnlyStopWords("A The AbOUT");
            expect(result).toBe(true);
        });

        // Negative Tests
        it("should return false if the sentence has no stop words", () => {
            const result = stopwordsHelper.hasOnlyStopWords(
                "Computer science test"
            );
            expect(result).toBe(false);
        });

        it("should return false if the sentence has not only stop words", () => {
            const result = stopwordsHelper.hasOnlyStopWords("a computer test");
            expect(result).toBe(false);
        });

        it("should handle punctuation and special characters appropriately", () => {
            const result = stopwordsHelper.hasOnlyStopWords("Hello, world!");
            expect(result).toBe(false);
        });

        it("should return false for an empty string", () => {
            const result = stopwordsHelper.hasOnlyStopWords("");
            expect(result).toBe(false);
        });
    });
});
