import { Telegraf } from "telegraf";
import { botCommands } from "./botCommands";
import AWS from "aws-sdk";
import { APIGatewayProxyEventV2 } from "aws-lambda";

AWS.config.update({ region: "eu-north-1" });
var ssm = new AWS.SSM();

const tokenPromise = ssm
  .getParameter({
    Name: "/lossibot/prod/token",
    WithDecryption: true,
  })
  .promise();

export const webhook = async (event: APIGatewayProxyEventV2) => {
  const tokenObj = await tokenPromise;
  const tokenValue = tokenObj?.Parameter?.Value ?? "";

  const bot = new Telegraf(tokenValue, {
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

export const setWebhook = async (event) => {
  const tokenObj = await tokenPromise;
  const tokenValue = tokenObj?.Parameter?.Value ?? "";

  const bot = new Telegraf(tokenValue, {
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
