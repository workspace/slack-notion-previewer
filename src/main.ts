import 'dotenv/config'
import { App } from '@slack/bolt';
import { last, keyBy, omit, mapValues } from 'lodash';

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: parseInt(process.env.PORT || "3000")
});

app.event('link_shared', async ({ event, client }) => {
    Promise.all(event.links.map(async ({ url }: { url: string }) => {
        const pageUrl = new URL(url);
        const lastPathSegment = last(pageUrl.pathname.split("/"))
        const pageId = lastPathSegment ? last(lastPathSegment.split("-")) : ""
        if (pageId === "") {
            throw new Error("pageId should not be null");
        }
        return {
            title: "title test",
            title_link: "https://notion.so",
            url: url
        };
    }))
        .then(attachments => keyBy(attachments, 'url'))
        .then(unfurls => mapValues(unfurls, attachment => omit(attachment, 'url')))
        .then(unfurls => {
            console.log(unfurls)
            client.chat.unfurl({
                ts: event.message_ts,
                channel: event.channel,
                unfurls
            });
        })
        .catch(console.error);
});

(async () => {
    // Start your app
    await app.start();
})();