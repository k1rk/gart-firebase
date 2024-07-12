const {
  onDocumentCreated,
  // Change,
  // FirestoreEvent,
} = require("firebase-functions/v2/firestore");

const logger = require("firebase-functions/logger");
const OpenAI = require("openai");
const {defineSecret, defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");

const openaiApiKey = defineSecret("OPENAI_API_KEY");
const assistantId = defineString("ASSISTANT_ID");

admin.initializeApp();

exports.generateplan = onDocumentCreated(
    {
      document: "profiles/{profileId}",
      secrets: [openaiApiKey],
      timeoutSeconds: 300,
    },
    async (event) => {
      // Get an object representing the document
      // e.g. {'name': 'Marie', 'age': 66}
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }
      const data = snapshot.data();
      // access a particular field as you would any JS property
      const email = data.email;

      // create client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      try {
        // const myAssistant = await openai.beta.assistants.retrieve(assistantId);
        const messageThread = await openai.beta.threads.create({
          metadata: {
            user_id: event.profileId,
          },
        });
        if (messageThread.id) {
          logger.info(
              `created new thread ${messageThread.id} for user ${email}`,
          );
        } else {
          throw new Error(messageThread);
        }

        const message = await openai.beta.messages.create({
          thread_id: messageThread.id,
          role: "user",
          content: "I want to create a plan to get fit",
        });
        if (!message.id) {
          throw new Error(message);
        }

        const stream = await openai.beta.threads.runs.create(
            messageThread.id,
            {assistant_id: assistantId, stream: true},
        );

        for await (const event of stream) {
          console.log(event);
        }
        admin.firestore().collection("results_test").add(stream.data);

        console.log(stream.data.required_action.submit_tool_outputs);
      } catch (error) {
        logger.error(
            `Unable to generate plan for user ${email}`,
            error,
        );
      }
    });
