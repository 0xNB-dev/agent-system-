import {getFilenameAndDirnameFromImportMeta, getPathIfNode, isNode, isValidAndExists, writeToFile} from './helpers/storageHandler.js';

/**
 * This class will handle communicating with the inference endpoints
 */
export class Inference {
  /**
   * TODO: Add unifiedParameters so we can coordinate the parameters across different inference endpoints and models
   *
   * @param {Object} parameters
   */
  constructor(parameters) {
    this.parameters = parameters;
    this.eventListeners = {
      "token": [],
      "done": []
    };
  }

  _formatToLog(generatedText, parameters) {
    return `
## Settings

${JSON.stringify(parameters, null, '  ')}

## Prompt

${parameters.prompt || parameters.messages}

## Generated Text

${generatedText}
  `;
  }

  async _saveToDisk(finalString, writeToConsole = false) {
    if (!isNode()) return;

    if (process?.env?.LOG_GENERATED_TEXT === 'true') {
      const d = new Date();
      let path = process?.env?.LOG_PATH;

      if (await isValidAndExists(path) !== true) {
        console.warn("The path set to LOG_PATH does not seem to exist, or permission are not allowing reads, please check, using default value instead", process.env.LOG_PATH);
        path = undefined; // reset path
      }

      if (!path) {
        // default if no path provided
        const nodePath = await getPathIfNode();
        const {__dirname} = await getFilenameAndDirnameFromImportMeta(import.meta);
        path = nodePath?.join(__dirname, `/../attempts/${this.parameters.model}/${d.toISOString()}.md`);
      }

      const success = await writeToFile(path, finalString);

      if (!success || writeToConsole) {
        console.dir(finalString);
      }
    }
  }

  on(event, listener) {
    if(!this.eventListeners[event]) this.eventListeners[event] = [];

    if(typeof listener !== "function") {
      throw new Error("The listener must be a function");
    }

    this.eventListeners[event].push(listener);
  }

  off(event, listener) {
    const listenerIndex = this.eventListeners[event].indexOf(listener);
    this.eventListeners[event].splice(listenerIndex, 1);
  }

  emit(event, data) {
    this.eventListeners[event].forEach((listener) => listener(data));
  }

  async handleStream(response) {
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    console.info("Response text: ", response.statusText);

    let generatedText = "";

    while (true) {
      const {value: rawValue, done} = await reader.read();
      if (done) {
        this.emit("done", true);
        break;
      }

      const tokens = rawValue.split("\n\n");

      for (const token of tokens) {
        if (token === "") continue;
        if (token === "data: [DONE]") break;

        const tokenData = token.replaceAll(/data:[^{]*/g, "");
        let valueJSON = "";
        let validOutput = true;

        try {
          valueJSON = JSON.parse(tokenData);
        } catch (parsingError) {
          console.error("Parsing of the token data failed, marking this value as invalid");
          validOutput = false;
        }

        if (!(typeof valueJSON === "object") || !valueJSON.hasOwnProperty("choices") || !Array.isArray(valueJSON.choices) || valueJSON.choices.length === 0) {
          validOutput = false;
        }

        if (isNode() && process?.env.LOG_STREAMING_PACKETS === 'true') {
          if (!validOutput || process.env.LOG_FULL_PACKETS === 'true') {
            // We output the line if the parsing failed or if it succeeded but yielded an incorrect JSON structure
            console.log(JSON.stringify(token));
          } else {
            // "data: {\"choices\":[{\"text\":\"     \"}],\"request_id\":\"8299aa05e8855bfc-NRT\",\"token\":{\"engine\":\"\",\"id\":418,\"logprob\":0,\"special\":false},\"id\":\"91f8923c6968a95122f348f5042057641922875ddbb96a7bd264e6bfd4a4a459\"}"
            console.dir({
              token: JSON.stringify(valueJSON.choices[0].text),
              logprob: valueJSON.token.logprob,
              special: valueJSON.token.special
            })
          }
        }

        if (validOutput) {
          for(const choice of valueJSON.choices) {
            let newToken;
            if(choice.text) {
              newToken = choice.text?.replaceAll(/\\n/g, "\n");
            } else if(choice.delta?.content) {
              newToken = choice.delta?.content.replaceAll(/\\n/g, "\n");
            }

            if(newToken) {
              this.emit("token", newToken);
              generatedText += newToken;
            }
          }
        }
      }
    }

    this._saveToDisk(generatedText, true);

    return generatedText;
  }
}