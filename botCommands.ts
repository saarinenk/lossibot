import { Markup, Telegraf } from "telegraf";
import got from "got/dist/source";
import Context from "telegraf/typings/context";
import { Response } from "got";
import { formatInTimeZone } from "date-fns-tz";
import { Update } from "telegraf/typings/core/types/typegram";
import * as cheerio from 'cheerio';

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

export const getSchedule = async () => {
  try {
    const response = await got(
      "https://www.finferries.fi/en/koodiviidakko/timetable/vartsala-1.7.2024-alkaen.html"
    );

    const $ = cheerio.load(response.body);
    
    // Extract Vartsala times
    const vartsalaTimes: string[] = [];
    $('ul').first().find('li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.match(/^\d{2}:\d{2}/)) {
        vartsalaTimes.push(text.substring(0, 5)); // Take only the time part (HH:mm)
      }
    });

    // Extract mainland times
    const mainlandTimes: string[] = [];
    $('ul').last().find('li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.match(/^\d{2}:\d{2}/)) {
        mainlandTimes.push(text.substring(0, 5)); // Take only the time part (HH:mm)
      }
    });

    return [vartsalaTimes, mainlandTimes];
  } catch (error) {
    console.log("error:", error);
    return [[], []];
  }
};

export const getMessage = async (ctx: Context, location: Location) => {
  const [scheduleVartsala, scheduleMainland] = await getSchedule() || [[], []];
  const schedule = location === "Vartsala" ? scheduleVartsala : scheduleMainland;
  
  if (!schedule.length) {
    ctx.replyWithHTML(
      "Sorry, I couldn't fetch the ferry schedule. Please try again later or check the schedule directly at <a href='https://www.finferries.fi/en/ferry-traffic/ferries-and-schedules/vartsala.html'>Finferries website</a>."
    );
    return [];
  }

  const filtered = filter(schedule);
  
  if (filtered.length === 0) {
    ctx.replyWithHTML(
      "It's getting late. The ferry stops running around 23 and continues early in the morning. If you still need a ride to the other side, call +358 40 013 8239 to order a crossing."
    );
    return [];
  }

  return filtered.slice(0, 3);
};

export const formatMessage = (timeArray: string[], currLocation: Location) =>
  timeArray.reduce(
    (acc, curr) => acc + `<b>${curr}   </b>`,
    `Next departure times from ${currLocation}: \n`
  );

export const filter = (arr: string[]) => {
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
