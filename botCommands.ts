import { Markup, Telegraf } from "telegraf";
import got from "got/dist/source";
import Context from "telegraf/typings/context";
import { Response } from "got";
import { formatInTimeZone } from "date-fns-tz";
import { Update } from "telegraf/typings/core/types/typegram";

interface FerrySchedule {
  sections: Sections;
}

interface Sections {
  [key: string]: Ferry[];
}

interface Ferry {
  id: number;
  name: string;
  owner: number;
  link: string;
  categories: string[];
  published: number;
  "aikataulu-voimassa-alkaen": Date;
  "aikataulu-voimassa-paattyy": Date;
  lahto: string;
  lahtoajat: string[];
  lisatietoja: string;
  paluu: string;
  paluuajat: string[];
  viikonpaiva: string[];
}

type Location = "Vartsala" | "mainland";

const getSchedule = async () => {
  try {
    const response: Response<FerrySchedule> = await got(
      "https://www.finferries.fi/en/koodiviidakko/timetable/vartsala-19.9.2016.json",
      { responseType: "json" }
    );

    console.log(response, response.body);
    const vartsala: string[] = response.body.sections["31"][0].lahtoajat;
    const mainland: string[] = response.body.sections["31"][0].paluuajat;

    return [vartsala, mainland];
  } catch (error) {
    console.log("error:", error);
  }
};

const getMessage = async (ctx: Context, location: Location) => {
  const [scheduleVartsala, scheduleMainland] = (await getSchedule()) || [
    [],
    [],
  ];

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

const formatMessage = (timeArray: string[], currLocation: Location) =>
  timeArray.reduce(
    (acc, curr) => acc + `<b>${curr}   </b>`,
    `Next departure times from ${currLocation}: \n`
  );

const filter = (arr: string[]) => {
  const currTime = formatInTimeZone(new Date(), "Europe/Helsinki", "HH:mm");
  return arr.filter((time) => time > currTime);
};

const inlineMessageKeyboard = Markup.inlineKeyboard([
  Markup.button.callback("Vartsala (island)", "Vartsala"),
  Markup.button.callback("Kivimaa (mainland)", "mainland"),
]);

export const botCommands = (bot: Telegraf<Context<Update>>) => {
  bot.start(async (ctx) => {
    ctx.replyWithHTML(
      "Welcome to check the next departure times for Vartsalan lossi in Kustavi, Finland! <b>Send any message to the bot to wake it up.</b>"
    );
    ctx.from?.id &&
      (await ctx.telegram.sendMessage(
        ctx.from.id,
        "Hi there! Where are you?",
        inlineMessageKeyboard
      ));
  });

  bot.help((ctx) =>
    ctx.reply("Send any message to the bot to get the next departures.")
  );

  bot.on("sticker", (ctx) => ctx.reply("⛴ Try sending me a message."));

  bot.on("text", async (ctx) => {
    ctx.from &&
      (await ctx.telegram.sendMessage(
        ctx.from.id,
        "Hi there! Where are you?",
        inlineMessageKeyboard
      ));
  });

  bot.action("Vartsala", async (ctx) => {
    const location: Location = "Vartsala";
    const message = await getMessage(ctx, location);
    return await ctx.replyWithHTML(formatMessage(message, location));
  });

  bot.action("mainland", async (ctx) => {
    const location: Location = "mainland";
    const message = await getMessage(ctx, location);
    return await ctx.replyWithHTML(formatMessage(message, location));
  });
};
