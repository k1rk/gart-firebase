const {
  onDocumentCreated,
  // Change,
  // FirestoreEvent,
} = require("firebase-functions/v2/firestore");

const fetch = require("node-fetch");
const logger = require("firebase-functions/logger");

/**
 * Posts a message to Discord with Discord's Webhook API
 *
 * @param {string} botName - The bot username to display
 * @param {string} messageBody - The message to post (Discord MarkDown)
 */
async function postMessageToDiscord(botName, messageBody) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error(
        "No webhook URL found. Set the Discord Webhook URL before deploying. Learn more about Discord webhooks here: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks",
    );
  }

  return fetch(webhookUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(
        // Here's what the Discord API supports in the payload:
        // https://discord.com/developers/docs/resources/webhook#execute-webhook-jsonform-params
        {
          content: messageBody,
          username: botName,
        },
    ),
  });
}

exports.createprofile = onDocumentCreated("profiles/{profileId}", async (event) => {
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

  const message = `
📱 New user registered with  <${email}>
  [Dashboard](https://barked.retool.com/apps/b2f0d388-d20b-11ee-b7e6-7b2d23b0ac38/onboarding%20profiles)
`;
  try {
    const response = await postMessageToDiscord("funnel", message);
    if (response.ok) {
      logger.info(
          `Posted user registration alert for ${email} to Discord`,
      );
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    logger.error(
        `Unable to post user registration alert for ${email} to Discord`,
        error,
    );
  }

  // perform more operations ...
});
