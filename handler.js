const { Telegraf } = require("telegraf");
const { botCommands } = require("./botCommands");

const TOKEN = process.env.LOSSI_BOT_TOKEN || "";
const bot = new Telegraf(TOKEN, { telegram: { webhookReply: true } });

botCommands(bot);

module.exports.webhook = async (event) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: "",
  };

  if (!event.body) {
    return response;
  }

  try {
    const update = JSON.parse(event.body);
    await bot.handleUpdate(update);
  } catch (error) {
    console.log("error:", error);
  }

  return response;
};

module.exports.setWebhook = async (event) => {
  const response = {
    statusCode: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: "Not Found",
  };

  try {
    let url = `https://${event.headers.Host}/${event.requestContext.stage}/webhook`;
    await bot.telegram.setWebhook(url);
    response.statusCode = 200;
  } catch (error) {
    console.log("error:", error);
  }

  return response;
};
