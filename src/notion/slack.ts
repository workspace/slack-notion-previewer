import {
    ImageBlock as SlackImageBlock,
    SectionBlock as SlackSectionBlock,
    ActionsBlock as SlackActionsBlock,
    Block as SlackBlock,
    PlainTextElement as SlackPlainTextElement,
    MrkdwnElement as SlackMrkdwnElement,
    ImageElement as SlackImageElement,
    Button as SlackButton,
} from '@slack/types'

import {
    Emoji as NotionEmoji,
    ExternalFile as NotionExternalFile,
    TitleInputPropertyValue as NotionTitleInputPropertyValue,
    Page as NotionPage,
    Block as NotionBlock,
    RichText as NotionRichText
} from "@notionhq/client/build/src/api-types"
import {
    buildNotionAppUrl,
    buildNotionWebUrl
} from './url'

export function toSlackBlocksFromNotionPageAndBlocks(page: NotionPage, pageBlocks: NotionBlock[]): SlackBlock[] {
    const emojiIcon = (page.icon as NotionEmoji)?.emoji
    const externalFileIcon = (page.icon as NotionExternalFile)?.external?.url
    const titleProperty = Object.values(page.properties)
        .find(property => property.type == "title") as NotionTitleInputPropertyValue
    const title = [
        ...(emojiIcon ? [emojiIcon] : []),
        ...titleProperty
            ?.title
            ?.map(title => title.plain_text, "") || []
    ]
        .join("")
    const description = toSlackMarkdownFromNotionBlocks(pageBlocks)
    const coverImageUrl = (page.cover as NotionExternalFile)?.external?.url
    const notionAppURL = buildNotionAppUrl(page.id)
    return [
        {
            ...{
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*<${page.url}|${title}>*\n\n${description}`,
                } as SlackMrkdwnElement
            },
            ...(externalFileIcon) && {
                accessory: {
                    type: "image",
                    image_url: externalFileIcon,
                    alt_text: "Page Icon"
                } as SlackImageElement
            }
        } as SlackSectionBlock,
        ...coverImageUrl
            ? [
                {
                    type: "image",
                    image_url: coverImageUrl,
                    alt_text: "Page Cover"
                } as SlackImageBlock,
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
                    } as SlackPlainTextElement,
                    url: notionAppURL,
                    action_id: "open_in_notion"
                } as SlackButton
            ]
        } as SlackActionsBlock,
    ]
}

function toSlackMarkdownFromNotionRichText(richTexts: NotionRichText[]): string {
    return richTexts.map(richText => {
        let result = richText.href
            ? `<${richText.href}|${richText.plain_text.trim()}>`
            : `${richText.plain_text.trim()}`
        if (richText.annotations.code) {
            result = `\`${result}\``
        }
        if (richText.annotations.bold) {
            result = `*${result}*`
        }
        if (richText.annotations.italic) {
            result = `_${result}_`
        }
        if (richText.annotations.strikethrough) {
            result = `~${result}~`
        }
        return result
    })
        .join(" ")
}

function toSlackMarkdownFromNotionBlock(block: NotionBlock): string {
    switch (block.type) {
        case "heading_1":
            return `*${toSlackMarkdownFromNotionRichText(block.heading_1.text)}*`
        case "heading_2":
            return `*${toSlackMarkdownFromNotionRichText(block.heading_2.text)}*`
        case "heading_3":
            return `*${toSlackMarkdownFromNotionRichText(block.heading_3.text)}*`
        case "to_do":
            return `${block.to_do.checked ? ":white_check_mark:" : ":white_square_button:"} ${toSlackMarkdownFromNotionRichText(block.to_do.text)}`
        case "child_page":
            return `:link:<${buildNotionWebUrl(block.id)}|${block.child_page.title.trim()}>`
        case "paragraph":
            return toSlackMarkdownFromNotionRichText(block.paragraph.text)
        case "bulleted_list_item":
            return `• ${toSlackMarkdownFromNotionRichText(block.bulleted_list_item.text)}`
        case "numbered_list_item":
            return `• ${toSlackMarkdownFromNotionRichText(block.numbered_list_item.text)}`
        case "toggle":
            return `• ${toSlackMarkdownFromNotionRichText(block.toggle.text)}`
        default:
            return ""
    }
}

function toSlackMarkdownFromNotionBlocks(notionBlocks: NotionBlock[]): string {
    return notionBlocks.map(notionBlock => toSlackMarkdownFromNotionBlock(notionBlock))
        .filter(markdown => markdown.length != 0)
        .join("\n")
}