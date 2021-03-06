const { Telegraf } = require("telegraf");
const Markup = require("telegraf/markup");
const express = require("express");
const expressApp = express();

const got = require("got");
var moment = require("moment-timezone");

const getSchedule = async () => {
  try {
    const response = await got(
      "https://www.finferries.fi/en/koodiviidakko/timetable/vartsala-19.9.2016.json",
      { responseType: "json" }
    );
    const vartsala = response.body.sections["31"][0].lahtoajat;
    const mainland = response.body.sections["31"][0].paluuajat;
    return [vartsala, mainland];
  } catch (error) {
    console.log(error);
  }
};

const getMessage = async (ctx, location) => {
  const [scheduleVartsala, scheduleMainland] = await getSchedule();
  const schedule =
    location === "Vartsala" ? scheduleVartsala : scheduleMainland;
  const filtered =
    filter(schedule).length > 0
      ? filter(schedule).slice(0, 3)
      : schedule.slice(0, 3);

  if (filter(schedule).length < 3) {
    ctx.replyWithHTML(
      "It's getting late. The ferry stops running around 23 and continues early in the morning. If you still need a ride to the other side, call the number found <a href='https://www.finferries.fi/en/ferry-traffic/ferries-and-schedules/vartsala.html'>here</a>."
    );
  }

  return filtered;
};

const formatMessage = (timeArray, currLocation) =>
  timeArray.reduce(
    (acc, curr) => acc + `<b>${curr}   </b>`,
    `Next departure times from ${currLocation}: \n`
  );

const filter = (arr) =>
  arr.filter((time) => time > moment().tz("Europe/Helsinki").format("HH:mm"));

const PORT = process.env.PORT || 3000;
const URL = process.env.URL || "https://lossi-bot.herokuapp.com";
const TOKEN = process.env.LOSSI_BOT_TOKEN || "";

const bot = new Telegraf(TOKEN);

bot.telegram.setWebhook(`${URL}/bot${TOKEN}`);
expressApp.use(bot.webhookCallback(`/bot${TOKEN}`));

const inlineMessageKeyboard = Markup.inlineKeyboard([
  Markup.callbackButton("Vartsala (island)", "Vartsala"),
  Markup.callbackButton("Kivimaa (mainland)", "mainland"),
]).extra();

bot.start(async (ctx) => {
  ctx.replyWithHTML(
    "Welcome to check the next departure times for Vartsalan lossi in Kustavi, Finland! <b>Send any message to the bot to wake it up.</b>"
  );
  await ctx.telegram.sendMessage(
    ctx.from.id,
    "Hi there! Where are you?",
    inlineMessageKeyboard
  );
});

bot.help((ctx) =>
  ctx.reply("Send any message to the bot to get the next departures.")
);

bot.on("sticker", (ctx) => ctx.reply("⛴ Try sending me a message."));

bot.on("message", (ctx) =>
  ctx.telegram.sendMessage(
    ctx.from.id,
    "Hi there! Where are you?",
    inlineMessageKeyboard
  )
);

bot.action("Vartsala", (ctx) => {
  const location = "Vartsala";
  return getMessage(ctx, location).then((i) =>
    ctx.replyWithHTML(formatMessage(i, location))
  );
});

bot.action("mainland", (ctx) => {
  const location = "mainland";
  return getMessage(ctx, location).then((i) =>
    ctx.replyWithHTML(formatMessage(i, location))
  );
});
bot.launch();

expressApp.get("/", (req, res) => {
  res.send("Hello World!");
});

expressApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
