const { Telegraf } = require("telegraf");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");

const got = require("got");
const moment = require("moment");

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

const getMessage = async (location) => {
  const [scheduleVartsala, scheduleMainland] = await getSchedule();
  const schedule =
    location === "vartsala" ? scheduleVartsala : scheduleMainland;
  const filtered =
    filter(schedule).length > 0
      ? filter(schedule).slice(0, 3)
      : schedule.slice(0, 3);

  return filtered;
};

const formatMessage = (timeArray) =>
  timeArray.reduce(
    (acc, curr) => acc + `<b>${curr} </b>`,
    "Next departure times: "
  );

const filter = (arr) => arr.filter((time) => time > moment().format("HH:mm"));

const bot = new Telegraf(process.env.LOSSI_BOT_TOKEN);

bot.start(async (ctx) => {
  ctx.reply(
    "Welcome to check the next departure times for Vartsalan lossi in Kustavi, Finland!"
  );
});
bot.help((ctx) => ctx.reply("Use the following commands to do stuff ..."));
bot.on("sticker", (ctx) => ctx.reply("⛴"));

bot.command("next", ({ reply }) => {
  reply(
    "One time keyboard",
    Markup.keyboard(["/vartsala", "/mainland"]).oneTime().resize().extra()
  );
});

bot.command("vartsala", (ctx) => {
  return getMessage("vartsala").then((i) =>
    ctx.replyWithHTML(formatMessage(i))
  );
});

bot.command("mainland", (ctx) => {
  return getMessage("mainland").then((i) =>
    ctx.replyWithHTML(formatMessage(i))
  );
});
bot.launch();
