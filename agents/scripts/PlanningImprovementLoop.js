import * as fs from "fs";
import * as dotenv from "dotenv";

import {Interactions, TogetherAIInference, ServerlessVLLMInference} from "framework";

const planningScenario = JSON.parse(fs.readFileSync("./scenarios/1_planning.json").toString());

dotenv.config();

/**
 * Planning session
 */

const planningSession = new Interactions({
  promptStyle: planningScenario.promptStyle,
  messages: planningScenario.messages,
  roles: {
    system: {
      archetype: "system",
      name: "",
      marker: "@@ Instruction"
    },
    user: {
      archetype: "user",
      name: "",
      marker: "@@ Instruction"
    },
    assistant: {
      archetype: "assistant",
      name: "",
      marker: "@@ Response",
    },
  }
});

// const planningAgent = new TogetherAIInference(planningScenario.parameters);
const planningAgent = new ServerlessVLLMInference(planningScenario.parameters);

for(let x = 0; x < 1; x++) {
  let generatedPlanningText = await planningAgent.generate(planningSession.getPrompt());

  if(/No changes needed/ig.test(generatedPlanningText)) {
    planningSession.addGeneratedAnswer(generatedPlanningText.replace(/No changes needed.*/ig, ''));
    console.log("Done");
    break;
  } else {
    planningSession.addGeneratedAnswer(generatedPlanningText);
    planningSession.addMessages([
      {
        role: "user",
        content: "Can you reflect on what you have written check if you have made any mistake and if you could improve it further or shorten it down? If no, repeat all the bullet-points and append exactly `No changes needed` underneath"
      },
      {
        role: "assistant",
        content: "",
      }
    ]);
  }
}