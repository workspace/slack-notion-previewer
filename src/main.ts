import 'dotenv/config'
import { App } from '@slack/bolt';
import {
    Button,
    MrkdwnElement,
    ImageElement,
    PlainTextElement,
    Block,
    ActionsBlock,
    ImageBlock,
    SectionBlock,
} from '@slack/types';
import { join, keyBy, omit, mapValues } from 'lodash';
import { getPageByURL } from './notion/api';
import {
    Page,
    Emoji,
    ExternalFile,
    TitlePropertyValue,
} from "@notionhq/client/build/src/api-types"

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: parseInt(process.env.PORT || "3000")
});

function buildNotionAppUrl(page: Page): string {
    const pageIdWithoutDash = page.id.replace(/-/g, "");
    return `notion://notion.so/${pageIdWithoutDash}`
}

function buildMessageAttachmentBlocks(page: Page): Block[] {
    const emojiIcon = (page.icon as Emoji)?.emoji
    const externalFileIcon = (page.icon as ExternalFile)?.external?.url
    const titleProperty = Object.values(page.properties)
        .find(property => property.type == "title") as TitlePropertyValue
    const title = join(
        [
            ...(emojiIcon ? [emojiIcon] : []),
            ...titleProperty
                ?.title
                ?.map(title => title.plain_text, "") || []
        ],
        ""
    );
    const coverImageUrl = (page.cover as ExternalFile)?.external?.url
    const notionAppURL = buildNotionAppUrl(page)
    return [
        {
            ...{
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*<${page.url}|${title}>*`,
                } as MrkdwnElement
            },
            ...(externalFileIcon) && {
                accessory: {
                    type: "image",
                    image_url: externalFileIcon,
                    alt_text: "Page Icon"
                } as ImageElement
            }
        } as SectionBlock,
        ...coverImageUrl
            ? [
                {
                    type: "image",
                    image_url: coverImageUrl,
                    alt_text: "Page Cover"
                } as ImageBlock,
            ]
            : [],
        {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Open in Notion"
                    } as PlainTextElement,
                    url: notionAppURL,
                    action_id: "open_in_notion"
                } as Button
            ]
        } as ActionsBlock,
    ]
}

app.action('open_in_notion', async ({ ack }) => {
    await ack();
});

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