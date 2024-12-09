const { tool } = require("@langchain/core/tools");
const axios = require('axios');

const checkUrlStatus = async (url) => {
    try {
        const response = await axios.head(url, { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) });
        return response.status === 200 ? `URL is live (${url})` : `URL is dead (${url})`;
    } catch (headError) {
        console.warn(`HEAD request failed for URL: ${url}. Trying GET request. Details: ${headError.message}`);
        try {
            const response = await axios.get(url, { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) });
            return response.status === 200 ? `URL is live (${url})` : `URL is dead (${url})`;
        } catch (getError) {
            console.error(`Error checking URL with GET request: ${url}. Details: ${getError.message}`);
            return `URL is dead (do not use): ${url}`;
        }
    }
};

const checkUrlStatusTool = tool(
    async (input) => {
        return await checkUrlStatus(input);
    },
    {
        name: "checkUrlStatus_function",
        description: "Quickly checks if a URL is live by making a HEAD request. If the HEAD request fails, it falls back to a GET request. Always use this tool to verify the status of a URL. Provide a valid URL as input to check its status. Example input: 'https://example.com'",
    }
);

module.exports = checkUrlStatusTool;