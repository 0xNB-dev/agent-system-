import * as promptStyles from "./models/promptStyles.js";

/**
 * This class will handle the data sent to and from the inference engines
 */
export class Interactions {
  constructor(params) {
    if(params) {
      // self hydrate if the parameters are available
      this.initSession(params);
    }
  }

  /**
   * @typedef {Object} Role - A role
   * @property {String} name - The name of the current role
   * @property {String} marker - The marker for the current role
   *
   * @typedef {Object} Roles - The set of all roles and their markers
   * @typedef {Role} role - A role, identified by its key
   *
   * @param {Roles} #roles
   */
  #roles = {};

  get roles() {
    return this.#roles;
  }

  /**
   * @typedef {Object} RoleMarkers - Defines the role markers that the API and model understands
   *
   * @param {RoleMarkers} #markers
   */
  #markers = {};

  get markers() {
    return this.#markers;
  }

  /**
   * @typedef {Object} ChatMessage - A chat message
   * @property {String} role - The current message role
   * @property {String} content - The current message content
   *
   * @typedef {Array} MessageList - The full message list
   * @property {ChatMessage} message - the chat message
   *
   * @param {MessageList} #messages - The list of all messages for this interaction session
   */
  #messages = [];

  get messages() {
    return this.#messages.map((message) => {
      delete message.name;
      return message;
    });
  }

  /**
   * @typedef {Object} Wrapper - A chat message
   * @property {String} start - The starting marker for this wrapper
   * @property {String} content - The ending marker for this wrapper
   *
   * @typedef {Object} Wrappers - A set of wrappers
   * @property {Wrapper} wrapper - the current wrapper
   *
   * @param {Wrappers} #wrappers - The set of all wrappers needed to construct the right structure
   */
  #wrappers = {};

  get wrappers() {
    return this.#wrappers;
  }

  // Private methods

  #addMessage(role, content, name = "") {
    // TODO: Add sanitization
    this.#messages.push({
      role,
      content,
      name
    });
  }

  #appendGeneratedContent(content) {
    this.#messages.at(-1).content += content;
  }

  #buildHistory() {
    let history = "";

    let latestRoleSet = "";

    // TODO: Parametrize name=

    for (const messageIndex in this.messages) {
      const message = this.messages[messageIndex];
      const isLastMessage = messageIndex === this.messages.length - 1;

      if (message.role === this.roles.system.archetype) {
        history += `

${this.wrappers.chat.start}${this.wrappers.chat.start ? this.markers.system : '' }${this.wrappers.chat.start && message.name ? 'name=' + message.name : ''}
${this.wrappers.session.start}
${this.wrappers.instruction.start}
${this.wrappers.system.start}${!this.wrappers.chat.start ? this.markers.system : ''}${!this.wrappers.chat.start && message.name ? 'name=' + message.name : ''}
${message.content}
${this.wrappers.system.end}
${this.wrappers.chat.end}

`;
      }

      if (message.role === this.roles.user.archetype) {
        if (latestRoleSet === this.roles.system.archetype) {
          history += `
${this.wrappers.chat.start}${this.markers.user}${message.name ? 'name=' + message.name : ''}
${message.content}
${this.wrappers.chat.end}
${this.wrappers.instruction.end}
`;
        } else {
          // We need to start the session, add instruction set and the chat and keep it open for the answer for Llama style
          history += `
${this.wrappers.session.start}
${this.wrappers.instruction.start}
${this.wrappers.chat.start}${this.markers.system}${message.name ? 'name=' + message.name : ''}
${message.content}
${this.wrappers.chat.end}       
${this.wrappers.instruction.end}
`;
        }
      }

      if (message.role === this.roles.assistant.archetype) {
        if (latestRoleSet === this.roles.user.archetype) {
          history += `
          ${this.wrappers.chat.start}${this.markers.assistant}${message.name ? 'name=' + message.name : ''}
          ${message.content}
          `;
        } else {
          // We need to start the session, add instruction set and the chat and keep it open for the answer for Llama style
          history += `
${this.wrappers.session.start}
${this.wrappers.chat.start}${this.markers.system}${message.name ? 'name=' + message.name : ''}
${message.content}
${this.wrappers.chat.end}
${this.wrappers.wrappers.session.end}
          `;
        }
      }

      latestRoleSet = message.role;
    }

    return history;
  }

  // Public Methods

  /**
   * Init a new chat session, will reset the history and store the system context atop the history.
   *
   * TODO: store existing history in a file as backup
   *
   * @typedef {"llama" | "chatML" | "alpaca" | "vicuna"} PromptStyle - One of the valid prompt styles
   *
   * @typedef {Object} InitSessionParameters - Defines the parameters needed to initialize the session
   * @property {MessageList} messages - The list of all messages to init this session with
   * @property {Wrappers?} wrappers - The wrapper type for the model in use. Will be used to wrap every message sent
   * @property {Roles?} roles - Roles to assign to be used for message list marking and pass to APIs
   * @property {PromptStyle} promptStyle - If you want to pass a promptStyle, it will hydrate roles and wrappers if they
   *                                       are not present. If you want to overwrite the default roles or wrappers, you
   *                                       can pass them along, promptStyle will not overwrite the ones you pass.
   *                                       Said differently, if roles and wrappers are present in the parameters passed,
   *                                       they will take precedence over promptStyle, which will hydrate the parameters
   *                                       if cannot find.
   *
   * @param {InitSessionParameters} params - Method parameters
   */
  initSession(params = {
    // Load all initial interactions from this one
    messages: [{
      role: "system",
      content: "You are a friendly AI, knowledgeable about things such as the universe, economy, geography, history. Please answer the user query concisely but effectively and to-the-point."
    }],
    promptStyle: "chatML",
    wrappers: {
      chat: {
        start: "",
        end: "",
      },
      session: {
        start: "",
        end: "",
      },
      instruction: {
        start: "",
        end: "",
      },
      system: {
        start: "",
        end: "",
      }
    },
    roles: {
      system: {
        archetype: "system",
        name: "",
        marker: "system"
      },
      user: {
        archetype: "user",
        name: "",
        marker: "user"
      },
      assistant: {
        archetype: "assistant",
        name: "",
        marker: "assistant",
      },
    }
  }) {
    this.#messages = [];

    if(params.promptStyle && Object.keys(promptStyles).indexOf(params.promptStyle) >= 0) {
      const promptStyle = promptStyles[params.promptStyle];

      if(!params.wrappers) {
        params.wrappers = promptStyle.wrappers;
      }
      if(!params.roles) {
        params.roles = promptStyle.roles;
      }
    } else if(Object.keys(promptStyles).indexOf(params.promptStyle) < 0) {
      console.warn("promptStyle passed is not valid", params.promptStyle);
    } else {
      console.error("promptStyle missing", params.promptStyle);
    }

    // Make sure it's not empty
    params.roles = Object.assign({
      system: {
        archetype: "system",
        name: "",
        marker: "### System Prompt"
      },
      user: {
        archetype: "user",
        name: "",
        marker: "### User Message"
      },
      assistant: {
        archetype: "assistant",
        name: "",
        marker: "### Assistant",
      },
    }, params.roles);

    // This makes the role list extensible
    for (const roleKey of Object.keys(params.roles)) {
      const currentRole = params.roles[roleKey];
      // Default to assistant
      this.#roles[roleKey] = {
        archetype: currentRole.archetype || params.roles.assistant.archetype,
        name: currentRole.name || params.roles.assistant.name,
      };
      this.#markers[roleKey] = currentRole.marker || params.roles.assistant.marker;
    }

    // Default to ChatML
    this.#wrappers = Object.assign({
      chat: {
        start: "<|im_start|>",
        end: "<|im_end|>",
      },
      session: {
        start: "",
        end: "",
      },
      instruction: {
        start: "",
        end: "",
      },
      system: {
        start: "",
        end: "",
      }
    }, params.wrappers);

    for (const message of params.messages) {
      const {role, content, name} = message;
      this.#addMessage(role, content, name);
    }
  }

  /**
   * @return {array | string}
   */
  getPrompt() {
    return this.#buildHistory();
  }

  addMessage(message) {
    const {role, content, name} = message;
    this.#addMessage(role, content, name);
  }

  addMessages(messages) {
    for(const message of messages) {
      this.addMessage(message);
    }
  }

  /**
   * Update latest message's content
   */
  addGeneratedAnswer(generatedText) {
    this.#appendGeneratedContent(generatedText);
  }
}