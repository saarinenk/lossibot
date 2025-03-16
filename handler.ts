import { Telegraf } from "telegraf";
import { botCommands } from "./botCommands";

const getToken = async () => {
  // For local development, use a test token
  if (process.env.STAGE === "local") {
    return "test_token";
  }
  
  // Only import AWS SDK if we need it
  const AWS = await import('aws-sdk');
  AWS.config.update({ region: "eu-north-1" });
  const ssm = new AWS.SSM();
  const tokenObj = await ssm
    .getParameter({
      Name: "/lossibot/prod/token",
      WithDecryption: true,
    })
    .promise();
  
  return tokenObj?.Parameter?.Value ?? "";
};

export const webhook = async (event: any) => {
  const tokenValue = await getToken();
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

export const setWebhook = async (event: any) => {
  const tokenValue = await getToken();
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
