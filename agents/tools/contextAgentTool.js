import { tool } from "@langchain/core/tools";
import { invokeContextAgent } from "../../services/ContextAgentService.js";
import loadContextSystemPrompt from "../../src/services/contextSystemPrompt.js";
import { contextSearch as googleSearch } from "./googleContextSearch.js";
import { contextSearch as canadaSearch } from "./canadaCaContextSearch.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for department scenario files
const SCENARIO_BASE = path.resolve(
  __dirname,
  "../../src/services/systemPrompt"
);

// Dynamically build a map of department scenario loaders by scanning the
// context-* folders under src/services/systemPrompt. This avoids having to
// update this file whenever a new department scenario is added.
function buildDepartmentModules() {
  const modules = {};
  try {
    const entries = fs.readdirSync(SCENARIO_BASE, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("context-")) {
        const dept = entry.name.replace("context-", "").toUpperCase();
        const scenarioFile = path.join(
          SCENARIO_BASE,
          entry.name,
          `${dept.toLowerCase()}-scenarios.js`
        );
        if (fs.existsSync(scenarioFile)) {
          modules[dept] = {
            getScenario: async () => {
              const url = pathToFileURL(scenarioFile).href;
              const mod = await import(url);
              return mod[`${dept}_SCENARIOS`] || "";
            },
          };
        }
      }
    }
  } catch {
    // Ignore scanning errors
  }
  return modules;
}

const departmentModules = buildDepartmentModules();

// Department specific scenario loaders used when the context service
// identifies a department for the current question. The list of available
// departments is generated automatically by scanning the context-*
// directories under src/services/systemPrompt so new scenarios are
// picked up without changes to this file.

// Mapping of French department abbreviations to English to support loading
// scenarios in both official languages.
const frenchDepartmentMap = {
  ARC: "CRA",
  EDSC: "ESDC",
  SAC: "ISC",
  CFP: "PSC",
  IRCC: "IRCC",
};

// Helper to load a department scenario string if available. Department
// acronyms are treated case-insensitively. Returns an empty string if the
// department isn't recognised or no scenario file exists.
async function loadDepartmentScenario(department, lang) {
  if (!department) return "";

  const upper = department.toUpperCase();
  const key =
    lang === "fr" && frenchDepartmentMap[upper]
      ? frenchDepartmentMap[upper]
      : upper;

  const loader = departmentModules[key];
  if (!loader) return "";

  try {
    return await loader.getScenario();
  } catch (error) {
    // Fail silently if scenario file can't be loaded
    return "";
  }
}

/**
 * Factory to create a context agent tool for a specific provider. The tool
 * performs a search based on the question and returns the generated context
 * string from the context agent.
 */
const createContextAgentTool = (agentType = 'openai') =>
  tool(
    async (
      { question, lang = 'en', searchProvider = 'google', chatId = 'system' }
    ) => {
      const systemPrompt = await loadContextSystemPrompt(lang);

      const searchFn = searchProvider.toLowerCase() === 'canadaca'
        ? canadaSearch
        : googleSearch;
      const searchResults = await searchFn(question, lang);

      const context = await invokeContextAgent(agentType, {
        chatId,
        message: question,
        systemPrompt,
        searchResults,
        conversationHistory: [],
        searchProvider,
      });

      let message = context.message;

      // Extract department abbreviation from the context message
      const match = message.match(/<department>([\s\S]*?)<\/department>/);
      const department = match ? match[1].trim() : '';

      // Load department scenarios if available and append to the message
      const scenario = await loadDepartmentScenario(department, lang);
      if (scenario) {
        message += `\n<departmentscenario>${scenario}<\/departmentscenario>`;
      }

      return message;
    },
    {
      name: 'generateContext',
      description:
        'Perform a search for the question and generate contextual information.',
      schema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'User question to analyse' },
          lang: { type: 'string', description: 'Language of the question' },
          searchProvider: {
            type: 'string',
            description: 'Search provider to use (google or canadaca)',
          },
        },
        required: ['question'],
      },
    }
  );

export default createContextAgentTool;
