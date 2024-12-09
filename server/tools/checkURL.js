const { tool } = require("@langchain/core/tools");
const axios = require('axios');

const checkUrlStatus = async (url) => {
    try {
        const response = await axios.head(url, { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) });
        return response.status === 200 ? `URL is live (${url})` : `URL is dead (${url})`;
    } catch (error) {
        console.error(`Error checking URL: ${url}. Details: ${error.message}`);
        return `URL is dead (do not use): ${url}`;
    }
};

const checkUrlStatusTool = tool(
    async (input) => {
        return await checkUrlStatus(input);
    },
    {
        name: "checkUrlStatus_function",
        description: "Quickly checks if a URL is live by making a HEAD request. Always use this tool to verfy the status of a URL. Provide a valid URL as input to check its status. Example input: 'https://example.com'",
    }
);

module.exports = checkUrlStatusTool;