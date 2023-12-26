import * as fs from "fs";
import * as dotenv from "dotenv";

import {Interactions, TogetherAIInference} from "framework";

const codingScenario = JSON.parse(fs.readFileSync("./scenarios/2_code.json").toString());

dotenv.config();

/**
 * Coding session
 */

const codingSession = new Interactions({
  promptStyle: codingScenario.promptStyle,
  messages: codingScenario.messages,
});

const codingAgent = new TogetherAIInference(codingScenario.parameters);

let generatedCodingText = await codingAgent.generate(codingSession.getPrompt());
codingSession.addGeneratedAnswer(generatedCodingText);

console.log("generatedCodingText");
console.dir(generatedCodingText);