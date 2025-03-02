import NotifmeSdk, { EmailProvider, SlackProvider, SmsProvider } from "notifme-sdk";
import axios from "axios";
import type { Channel } from "notifme-sdk";
import { replaceEnvironmentVariables } from "./environment";

const channels: {
  email?: Channel<EmailProvider>;
  sms?: Channel<SmsProvider>;
  slack?: Channel<SlackProvider>;
} = {};

// Support legacy environment variables for Discord
if (process.env.DISCORD_WEBHOOK_URL)
  process.env.NOTIFICATION_DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (
  process.env.NOTIFICATION_EMAIL_SENDGRID ||
  process.env.NOTIFICATION_EMAIL_SES ||
  process.env.NOTIFICATION_EMAIL_SPARKPOST ||
  process.env.NOTIFICATION_EMAIL_MAILGUN ||
  process.env.NOTIFICATION_EMAIL_SMTP
) {
  channels.email = {
    providers: [],
    multiProviderStrategy:
      (process.env.NOTIFICATION_EMAIL_STRATEGY as "fallback" | "roundrobin" | "no-fallback") ||
      "roundrobin",
  };

  if (process.env.NOTIFICATION_EMAIL_SENDGRID) {
    channels.email.providers.push({
      type: "sendgrid",
      apiKey: process.env.NOTIFICATION_EMAIL_SENDGRID_API_KEY as string,
    });
  }
  if (process.env.NOTIFICATION_EMAIL_SES) {
    channels.email.providers.push({
      type: "ses",
      region: process.env.NOTIFICATION_EMAIL_SES_REGION as string,
      accessKeyId: process.env.NOTIFICATION_EMAIL_SES_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.NOTIFICATION_EMAIL_SES_SECRET_ACCESS_KEY as string,
      sessionToken: process.env.NOTIFICATION_EMAIL_SES_SESSION_TOKEN as string,
    });
  }
  if (process.env.NOTIFICATION_EMAIL_SPARKPOST) {
    channels.email.providers.push({
      type: "sparkpost",
      apiKey: process.env.NOTIFICATION_EMAIL_SPARKPOST_API_KEY as string,
    });
  }
  if (process.env.NOTIFICATION_EMAIL_MAILGUN) {
    channels.email.providers.push({
      type: "mailgun",
      apiKey: process.env.NOTIFICATION_EMAIL_MAILGUN_API_KEY as string,
      domainName: process.env.NOTIFICATION_EMAIL_MAILGUN_DOMAIN_NAME as string,
    });
  }
  if (process.env.NOTIFICATION_EMAIL_SMTP) {
    channels.email.providers.push({
      type: "smtp",
      port: (process.env.NOTIFICATION_EMAIL_SMTP_PORT
        ? parseInt(process.env.NOTIFICATION_EMAIL_SMTP_PORT, 10)
        : 587) as 587 | 25 | 465,
      host: process.env.NOTIFICATION_EMAIL_SMTP_HOST as string,
      auth: {
        user: process.env.NOTIFICATION_EMAIL_SMTP_USERNAME as string,
        pass: process.env.NOTIFICATION_EMAIL_SMTP_PASSWORD as string,
      },
    });
  }
}

if (
  process.env.NOTIFICATION_SMS_46ELKS ||
  process.env.NOTIFICATION_SMS_CALLR ||
  process.env.NOTIFICATION_SMS_CLICKATELL ||
  process.env.NOTIFICATION_SMS_INFOBIP ||
  process.env.NOTIFICATION_SMS_NEXMO ||
  process.env.NOTIFICATION_SMS_OVH ||
  process.env.NOTIFICATION_SMS_PLIVO ||
  process.env.NOTIFICATION_SMS_TWILIO
) {
  channels.sms = {
    providers: [],
    multiProviderStrategy:
      (process.env.NOTIFICATION_SMS_STRATEGY as "fallback" | "roundrobin" | "no-fallback") ||
      "roundrobin",
  };
  if (process.env.NOTIFICATION_SMS_46ELKS) {
    channels.sms.providers.push({
      type: "46elks",
      apiUsername: process.env.NOTIFICATION_SMS_46ELKS_API_USERNAME as string,
      apiPassword: process.env.NOTIFICATION_SMS_46ELKS_API_PASSWORD as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_CALLR) {
    channels.sms.providers.push({
      type: "callr",
      login: process.env.NOTIFICATION_SMS_CALLR_LOGIN as string,
      password: process.env.NOTIFICATION_SMS_CALLR_PASSWORD as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_CLICKATELL) {
    channels.sms.providers.push({
      type: "clickatell",
      apiKey: process.env.NOTIFICATION_SMS_CLICKATELL_API_KEY as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_INFOBIP) {
    channels.sms.providers.push({
      type: "infobip",
      username: process.env.NOTIFICATION_SMS_INFOBIP_USERNAME as string,
      password: process.env.NOTIFICATION_SMS_INFOBIP_PASSWORD as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_NEXMO) {
    channels.sms.providers.push({
      type: "nexmo",
      apiKey: process.env.NOTIFICATION_SMS_NEXMO_API_KEY as string,
      apiSecret: process.env.NOTIFICATION_SMS_NEXMO_API_SECRET as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_OVH) {
    channels.sms.providers.push({
      type: "ovh",
      appKey: process.env.NOTIFICATION_SMS_OVH_APP_KEY as string,
      appSecret: process.env.NOTIFICATION_SMS_OVH_APP_SECRET as string,
      consumerKey: process.env.NOTIFICATION_SMS_OVH_CONSUMER_KEY as string,
      account: process.env.NOTIFICATION_SMS_OVH_ACCOUNT as string,
      host: process.env.NOTIFICATION_SMS_OVH_HOST as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_PLIVO) {
    channels.sms.providers.push({
      type: "plivo",
      authId: process.env.NOTIFICATION_SMS_PLIVO_AUTH_ID as string,
      authToken: process.env.NOTIFICATION_SMS_PLIVO_AUTH_TOKEN as string,
    });
  }
  if (process.env.NOTIFICATION_SMS_TWILIO) {
    channels.sms.providers.push({
      type: "twilio",
      accountSid: process.env.NOTIFICATION_SMS_TWILIO_ACCOUNT_SID as string,
      authToken: process.env.NOTIFICATION_SMS_TWILIO_AUTH_TOKEN as string,
    });
  }
}

if (process.env.NOTIFICATION_SLACK) {
  channels.slack = {
    providers: [],
    multiProviderStrategy:
      (process.env.NOTIFICATION_SLACK_STRATEGY as "fallback" | "roundrobin" | "no-fallback") ||
      "roundrobin",
  };

  if (process.env.NOTIFICATION_SLACK_WEBHOOK) {
    channels.slack.providers.push({
      type: "webhook",
      webhookUrl: process.env.NOTIFICATION_SLACK_WEBHOOK_URL as string,
    });
  }
}

const notifier = new NotifmeSdk({
  channels,
});

export const sendNotification = async (message: string) => {
  console.log("Sending notification", message);
  message = replaceEnvironmentVariables(message);

  if (channels.email) {
    console.log("Sending email");
    try {
      await notifier.send({
        email: {
          from: (process.env.NOTIFICATION_EMAIL_FROM || process.env.NOTIFICATION_EMAIL) as string,
          to: (process.env.NOTIFICATION_EMAIL_TO || process.env.NOTIFICATION_EMAIL) as string,
          subject: message,
          html: message,
        },
      });
      console.log("Success email");
    } catch (error) {
      console.log("Got an error", error);
    }
    console.log("Finished sending email");
  }
  if (channels.sms) {
    console.log("Sending SMS");
    try {
      await notifier.send({
        sms: {
          from: process.env.NOTIFICATION_SMS_FROM as string,
          to: process.env.NOTIFICATION_SMS_TO as string,
          text: message,
        },
      });
      console.log("Success SMS");
    } catch (error) {
      console.log("Got an error", error);
    }
    console.log("Finished sending SMS");
  }
  if (channels.slack) {
    console.log("Sending Slack");
    try {
      await notifier.send({
        slack: {
          text: message,
        },
      });
      console.log("Success Slack");
    } catch (error) {
      console.log("Got an error", error);
    }
    console.log("Finished sending Slack");
  }
  if (process.env.NOTIFICATION_DISCORD_WEBHOOK_URL) {
    console.log("Sending Discord");
    try {
      await axios.post(process.env.NOTIFICATION_DISCORD_WEBHOOK_URL as string, {
        content: message,
      });
      console.log("Success Discord");
    } catch (error) {
      console.log("Got an error", error);
    }
    console.log("Finished sending Discord");
  }
  if (process.env.NOTIFICATION_TELEGRAM && process.env.NOTIFICATION_TELEGRAM_BOT_KEY) {
    console.log("Sending Telegram");
    try {
      await axios.post(
        `https://api.telegram.org/bot${process.env.NOTIFICATION_TELEGRAM_BOT_KEY}/sendMessage`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          chat_id: process.env.NOTIFICATION_TELEGRAM_CHAT_ID,
          text: message,
        }
      );
      console.log("Success Telegram");
    } catch (error) {
      console.log("Got an error", error);
    }
    console.log("Finished sending Telegram");
  }
};
