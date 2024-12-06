const { tool } = require("@langchain/core/tools");
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extracts the content of the body from a cheerio object, including all text and keeping <a> tags,
 * with newline characters after block elements.
 * @param {object} $ - The cheerio object of the parsed HTML.
 * @returns {string} - The extracted body content with links and formatted text.
 */
function extractBodyContentWithLinks($) {
    const bodyContent = [];
    const blockTags = new Set(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'hr']);
    const mainTag = $('main');

    if (mainTag.length > 0) {
        mainTag.find('*').each((_, element) => {
            const tag = $(element);
            if (element.type === 'text') {
                // Strip and add text if not empty
                const text = tag.text().trim();
                if (text) bodyContent.push(text);
            } else if (element.tagName === 'a') {
                // Keep the <a> tag as is
                bodyContent.push($.html(element).trim());
            } else if (blockTags.has(element.tagName)) {
                // Add the text of the block element and a newline
                const text = tag.text().trim();
                if (text) bodyContent.push(text + '\n');
            } else {
                // For other tags, just add their text content
                const text = tag.text().trim();
                if (text) bodyContent.push(text);
            }
        });
    }

    // Join all parts into a single string, handling extra spaces possibly introduced by newlines
    return bodyContent.join(' ').trim();
}

const downloadAndParseWebpage = async (url) => {
    try {
        const response = await axios.get(url, { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) });
        const $ = cheerio.load(response.data);
        return $;
    } catch (error) {
        console.error(`Could not connect to ${url} because: Request failed: ${error.message}`);
        return null;
    }
};

const downloadWebPageTool = tool(
    async (input) => {
        try {
            const $ = await downloadAndParseWebpage(input);
            if (!$) {
                return `Failed to download or parse the webpage: ${input}`;
            }

            const content = extractBodyContentWithLinks($);
            return content || `No meaningful content extracted from ${input}`;
        } catch (error) {
            console.error(`Error processing URL: ${input}. Details: ${error.message}`);
            return `An error occurred while processing the URL: ${input}`;
        }
    },
    {
        name: "downloadWebPage_function",
        description: "When information about a URL is needed, use this function to get the web page content. Provide a valid URL as input to download and parse its content. Example input: 'https://example.com'",
        
    }
);
  
module.exports = downloadWebPageTool;