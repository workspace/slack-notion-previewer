import 'dotenv/config'
import { App } from '@slack/bolt';
import {
    Block,
    HeaderBlock
} from '@slack/types';
import { join, keyBy, omit, mapValues } from 'lodash';
import { getPageByURL } from './notion/api';
import {
    Page,
    Emoji,
    TitlePropertyValue,
} from "@notionhq/client/build/src/api-types"

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: parseInt(process.env.PORT || "3000")
});

function buildMessageAttachmentBlocks(page: Page): Block[] {
    const iconEmoji = (page?.icon as Emoji)?.emoji
    const title = join(
        [
            ...(iconEmoji ? [iconEmoji] : []),
            ...(page?.properties["title"] as TitlePropertyValue)
                ?.title
                ?.map(title => title.plain_text, "") || []
        ],
        ""
    );
    return [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: title,
                emoji: true
            }
        } as HeaderBlock,
    ]
}

app.event('link_shared', async ({ event, client }) => {
    Promise.all(event.links.map(async ({ url }: { url: string }) => {
        const pageUrl = new URL(url);
        const page = await getPageByURL(pageUrl);
        if (!page) throw new Error("Page is not found");
        return {
            blocks: buildMessageAttachmentBlocks(page),
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