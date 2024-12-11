const { tool } = require("@langchain/core/tools");
const { chromium } = require("playwright");
const cheerio = require("cheerio");
const { URL } = require("url");

/**
 * Extracts search results from the ISC search results page.
 * @param {string} baseUrl - The base URL used to resolve relative links.
 * @param {object} $ - The Cheerio object of the parsed HTML.
 * @param {number} numResults - The number of top results to extract.
 * @returns {string} - The formatted top search results with summary, link, and link text.
 */
function extractSearchResults(baseUrl, $, numResults = 3) {
    let extractedResults = "";
    const resultsDiv = $("div.results");

    if (resultsDiv.length) {
        const sections = resultsDiv.find("section");

        sections.slice(0, numResults).each((_, section) => {
            const titleElement = $(section).find("h3 a.result-link");
            if (titleElement.length) {
                let link = titleElement.attr("href");
                const linkText = titleElement.text().trim();

                // Ensure link is absolute
                if (link && !link.startsWith("http")) {
                    link = new URL(link, baseUrl).href;
                }

                const summary = $(section).find("p").text().trim();

                extractedResults += `Summary: ${summary}\nLink: ${link}\nLink Text: ${linkText}\n\n`;
            }
        });
    }

    return extractedResults || "No results found.";
}

/**
 * Downloads and parses the search results page using Playwright and Cheerio.
 * @param {string} url - The URL to download and parse.
 * @param {string} selectorToWaitFor - The selector to wait for before extracting content.
 * @returns {object} - Cheerio object of the loaded HTML.
 */
const dynamicDownloadAndParseWebpage = async (url, selectorToWaitFor = "div.results") => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(selectorToWaitFor, { timeout: 5000, polling: 100 });

        // Get the HTML content after dynamic content has loaded
        const html = await page.content();
        return cheerio.load(html);
    } catch (error) {
        console.error(`Could not connect to ${url} because: ${error.message}`);
        return null;
    } finally {
        await browser.close();
    }
};

/**
 * canadaCASearch tool to perform a search on the Indigenous Services Canada website.
 */
const canadaCASearch = tool(
    async ({ lang, query }) => {
        try {
            let iscUrl = "https://www.canada.ca/en/indigenous-services-canada/search.html?q=";
            if (lang === "fra") {
                iscUrl = "https://www.canada.ca/fr/services-autochtones-canada/rechercher.html?q=";
            }

            console.log(`Starting search with query: ${query}`);
            const fullUrl = iscUrl + encodeURIComponent(query);
            const $ = await dynamicDownloadAndParseWebpage(fullUrl);

            if (!$) {
                return `Failed to download or parse the search results for query: ${query}`;
            }

            const results = extractSearchResults(iscUrl, $);
            console.log(`Results returned for query: ${query}`);
            return results || `No meaningful results extracted for query: ${query}`;
        } catch (error) {
            console.error(`Error processing search query: ${query}. Details: ${error.message}`);
            return `An error occurred while processing the search query: ${query}`;
        }
    },
    {
        name: "canadaCASearch",
        description: "Perform a search on the Indigenous Services Canada website. Provide 'lang' ('eng' for English or 'fra' for French) and 'query' as the search term. Example input: { lang: 'eng', query: 'health services' }",
        schema: {
            type: "object",
            properties: {
                lang: {
                    type: "string",
                    enum: ["eng", "fra"],
                    description: "The language of the search ('eng' for English or 'fra' for French).",
                },
                query: {
                    type: "string",
                    description: "The search term to query on the Indigenous Services Canada website.",
                },
            },
            required: ["lang", "query"],
        },
    }
);

module.exports = canadaCASearch;
