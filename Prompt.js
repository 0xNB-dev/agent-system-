import * as fs from "fs";
import {fileURLToPath} from 'url';
import {dirname, join} from "path";
import {llama} from "framework";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const xMonaco = fs.readFileSync('../data/0xMonaco.sol').toString();
const ICar = fs.readFileSync('../data/ICar.sol').toString();
const CarData = fs.readFileSync('../data/CarData.sol').toString();
const strategy1 = fs.readFileSync('../data/strategy_1.sol').toString();
const strategy2 = fs.readFileSync('../data/strategy_2.sol').toString();
const strategy3 = fs.readFileSync('../data/strategy_3.sol').toString();

const systemMessage = 'You are a Solidity Engineer AI. You have designed and written a game called 0xMonaco, written in solidity' +
  ' that allows 3 solidity ICar strategies to compete against each other in a turn by turn race, each strategy starts' +
  ' with 17500 coins. The first strategy reaching y = 1000 wins. \n' +
  'In order to get there, each strategy has to buy actions, each of which have a cost, and the cost goes up the more' +
  ' they are bought. The cost function follows a Variable Rate Gradual Dutch Auction formula, which is essentially a' +
  ' logarithmic cost they more they are bought.\n' +
  'Note: A car and a strategy are the same thing and these terms are used interchangeably.\n' +
  '\n' +
  'The actions are:\n' +
  '- acceleration: each purchase allows you to move faster. You can buy 1 to N acceleration each turn.\n' +
  '- shell: it will cancel all accelerations for the strategy / ICar in front of the current player\n' +
  '- super-shell: it will cancel all accelerations for the strategy / ICar in front of the current player, all the way' +
  ' to the first player.\n' +
  '- banana: it will stay where the strategy / ICar has dropped it and the next strategy / ICar running into it will' +
  ' have its speed cut in half.\n' +
  '- shield: it will prevent the current player from being hit by a banana, a shell or a super shell.\n' +
  '\n' +
  'The SDK for checking the cost of buying actions and for buying actions is as follows:' +
  '   You can get the cost for each action by using the following methods:\n' +
  '     `monaco.getShellCost(1) to get the cost for 1 shell\n' +
  '     `monaco.getSuperShellCost(1) to get the cost for 1 super shell\n' +
  '     `monaco.getBananaCost() to get the cost for 1 banana\n' +
  '     `monaco.getShieldCost(1) to get the cost for 1 shield\n' +
  '     `monaco.getAccelerateCost(N)` to get the cost for N accelerations where N is any number from 1 to 100\n' +
  '   You can buy each action by using the following methods:\n' +
  '     `monaco.buyShell(1)` to buy 1 shell\n' +
  '     `monaco.buySuperShell(1)` to buy 1 super shell\n' +
  '     `monaco.buyBanana()` to buy 1 banana\n' +
  '     `monaco.buyShield(1)` to buy 1 shield\n' +
  '     `monaco.buyAcceleration(N)` to buy N accelerations where N is any number from 1 to 100. It will only succeed if you have enough balance to buy these N accelerations.\n' +
  'Note that due to the cost function, buying 5 accelerations is exponentially more expensive than buying 1.\n' +
  '\n' +
  'Each strategy / car has a data structure called CarData, described as follows:\n' +
  '```solidity\n' +
  `${CarData}\n` +
  '```\n' +
  '\n' +
  'The rules are as follows:\n' +
  '- 3 car strategies race against each other\n' +
  '- Each car strategy starts the game with 17500 coins\n' +
  '- Each car strategy plays turn by turn, once after another, so car 1, then car 2, then car 3, then car 1 again\n' +
  '- At each turn, the car strategy entrypoint is called, and some immutable state data is passed:' +
  '  - allCars, the array of the state of each car strategy\n' +
  '  - bananas, the array of all the banana y position in the race\n' +
  '  - ourCarIndex, the index of the state of the car strategy being called in the allCars array\n' +
  '- The first strategy reaching y = 1000 wins\n' +
  '- In order to win, each strategy has to buy actions, each of which have a cost, and the cost goes up the more' +
  ' they are bought, logarithmically. Conversely, if no action is bought (for example because they are too expensive), then the cost ' +
  'goes down, also logarithmically\n' +
  '- The actions that can be bought are the following:' +
  '  - accelerations: each purchase allows the car strategy to move faster. You can buy 1 or more acceleration each ' +
  'turn, so long as you have enough balance. Each acceleration means that you will move by `y= y + acceleration`, ' +
  'so your position will move further by `acceleration` this turn. For example, if you buy 5 accelerations (' +
  '`accelerationsBought = 5`, your current `y` is 100 and your speed before buying is 5, then you will have ' +
  '`speed = speed + accelerationsBought` and `y  = y + speed` after accelerations are bought, before the next car' +
  'strategy\'s turn\n' +
  '  - shells: it will cancel all accelerations for the car strategy immediately in front of the car strategy using ' +
  'it, so if the strategy in front `allCars[ourCarIndex-1].speed=10` before buying the shell, it will become ' +
  '`allCars[ourCarIndex-1].speed=10` after buying it. The cost of the shell will go up logarithmically for the next ' +
  'shell that will be bought\n' +
  '  - super-shells: it will cancel all accelerations for all the car strategies in front of the car strategy using it, ' +
  'so if the strategy in front has `allCars[ourCarIndex-1].speed=10` before buying the shell, it will become ' +
  '`allCars[ourCarIndex-1].speed=10` after buying it, same for the car in front of that car, if your car is in 3rd ' +
  'position. The cost of the super-shell will go up logarithmically for the next super-shell that will be bought\n' +
  '- banana: it will stay where the car strategy has dropped it and the next car strategy running into it will' +
  ' have its speed cut in half.\n' +
  '- shield: it will prevent the current player from being hit by a banana, a shell or a super shell during the next ' +
  'car turn.\n' +
  '\n' +
  'Note: It is important to observe that if you do NOT buy accelerations after beginning the race or after your car has been shelled or super-shelled, your car will NOT move, as these reset speed back to 0.\n\n' +
  'Here the code for the ICar interface, which describes the parameters available for each car:\n' +
  '```solidity\n' +
  `${ICar}\n` +
  '```\n' +
  // 'Here the code for the 0xMonaco contract for reference only, you do NOT need to modify or reuse it:\n' +
  // '```solidity\n' +
  // `${xMonaco}\n` +
  // '```\n' +
  // '\n' +
  'Below are 3 examples of strategies others have written for your understanding. You may reuse parts of them.\n' +
  'Strategy 1, focusing on speed, but also making good use of resources:\n' +
  '```solidity\n' +
  `${strategy1}\n` +
  '```\n' +
  'Strategy 2, that makes sure no banana will impact its speed, buys actions when they are cheap and make sense,' +
  ' and tries to speed up if the strategy is late (behind every other cars):\n' +
  '```solidity\n' +
  `${strategy2}\n` +
  '```\n' +
  ' Strategy 3, which has different aggressiveness whether it is losing or winning, and focuses on buying actions that' +
  ' make sense up to the floor it has set, depending on the settings:\n' +
  '```solidity\n' +
  `${strategy3}\n` +
  '```\n';

const userMessage = 'Provide the FULL and complete code for a complex implementation of a 0xMonaco Strategy game that fulfils the user request.\n' +
  'Here\'s a suggested plan for creating a Solidity strategy for the 0xMonaco game, using Solidity 0.8:\n' +
  '1. Start by understanding the game rules and strategy components.\n' +
  '2. Plan your car strategy by identifying your primary objectives and your secondary objectives.\n' +
  '3. Plan for the acceleration component: Use this to maximize your speed and position. Start conserving resources in the latter half of the race when y > 700.\n' +
  '4. Plan for the shells component: Use this to outpace the leading car and potentially outlast others. Only use this when the car ahead is significantly faster (speed > 10).\n' +
  '5. Plan for the super shells component: Use this to eliminate immediate danger from leading cars. Reserve this for critical moments.\n' +
  '6. Plan for the bananas component: Use this to eliminate direct competition with leading cars. Use this sparingly and focus on positioning.\n' +
  '7. Plan for the shielding component: Use this to minimize the risk of being hit by a banana, shell or super shell.\n' +
  'Make sure to extract the variables first so you can reuse them within the code and remember that you start with a balance of only 17500, so ' +
  'buying an action below 250 is considered cheap, buying it below 1000 is considered relatively normal, buying it above 1000 is expensive, above 2000 is very expensive.\n' +
  'Follow this plan step by step, but you may improve it with ways you think will benefit the success of the outcome.\n';

const assistantMessage = 'Here is the full implementation for a complex strategy:\n' +
  '\n' +
  '```solidity\n' +
  '// SPDX-License-Identifier: MIT\n' +
  'pragma solidity 0.8.17;\n' +
  '\n' +
  'import "./../../interfaces/ICar.sol";\n' +
  '\n' +
  'contract FastAndFuriousStrategy is ICar {\n' +
  '  function takeYourTurn(\n' +
  '    Monaco monaco,\n' +
  '    Monaco.CarData[] calldata allCars,\n' +
  '    uint256[] calldata bananas,\n' +
  '    uint256 ourCarIndex\n' +
  '  ) external override {\n' +
  '    Monaco.CarData memory ourCar = allCars[ourCarIndex];\n';

const parameters = {
  "model": "Phind/Phind-CodeLlama-34B-v2",
  // "model": "DiscoResearch/DiscoLM-mixtral-8x7b-v2",
  // "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "max_tokens": 4096,
  "prompt": "",
  "temperature": 0.5,
  "top_p": 0.7,
  "top_k": 20,
  "repetition_penalty": 1,
  "stream_tokens": true,
  "stop": [
    "<|im_end|>",
    "<|im_start|>",
    "</s>",
  ]
};

// const parameters = {
//   "model": "accounts/fireworks/models/mixtral-8x7b",
//   "max_tokens": 4096,
//   "prompt": "",
//   "messages": [],
//   "stream": true,
//   "n": 1,
//   "temperature": 1,
//   "top_p": 1,
// };

const filePath = join(__dirname, `/2_code.json`);
console.log(filePath);
fs.writeFileSync(filePath, JSON.stringify({
  promptStyle: "alpaca",
  parameters,
  messages: [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: userMessage,
    },
    {
      role: "assistant",
      content: assistantMessage,
    }
  ]
}));
