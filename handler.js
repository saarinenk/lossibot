const { Telegraf } = require("telegraf");
const { botCommands } = require("./botCommands");
var AWS = require("aws-sdk");

AWS.config.update({ region: "eu-north-1" });
var ssm = new AWS.SSM();

const tokenPromise = ssm
  .getParameter({
    Name: "/lossibot/prod/token",
    WithDecryption: true,
  })
  .promise();

module.exports.webhook = async (event) => {
  const token = await tokenPromise;
  const bot = new Telegraf(token.Parameter.Value, {
    telegram: { webhookReply: true },
  });
  botCommands(bot);

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
  const token = await tokenPromise;
  const bot = new Telegraf(token.Parameter.Value, {
    telegram: { webhookReply: true },
  });

  const response = {
    statusCode: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: "",
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
