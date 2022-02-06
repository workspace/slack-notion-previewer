import 'dotenv/config'
import { App } from '@slack/bolt';
import { keyBy, omit, mapValues } from 'lodash';
import { getPageByURL, getPageBlocksByURL } from './notion/api';
import {
    toSlackBlocksFromNotionPageAndBlocks
} from './notion/slack';

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: parseInt(process.env.PORT || "3000")
});

app.action('open_in_notion', async ({ ack }) => {
    await ack();
});

app.event('link_shared', async ({ event, client }) => {
    Promise.all(event.links.map(async ({ url }: { url: string }) => {
        const pageUrl = new URL(url);
        const page = await getPageByURL(pageUrl);
        const pageBlocks = await getPageBlocksByURL(pageUrl);
        if (!page) throw new Error("Page is not found");
        if (!pageBlocks) throw new Error("Page blocks are not found");
        return {
            blocks: toSlackBlocksFromNotionPageAndBlocks(page, pageBlocks),
            url: url,
        }
    }))
        .then(attachments => keyBy(attachments, 'url'))
        .then(unfurls => mapValues(unfurls, attachment => omit(attachment, 'url')))
        .then(unfurls => {
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