import { Client } from '@notionhq/client'
import {
    Page,
    Block,
} from "@notionhq/client/build/src/api-types"

const notion = new Client({
    auth: process.env.NOTION_TOKEN
})

function getLastSegment(url: URL): string {
    const segments = url.pathname.split("/")
    const segment = segments.pop() || segments.pop()
    if (segment) {
        return segment
    } else {
        throw new Error("cannot get last segment from url")
    }
}

function toPageId(lastSegment: string): string {
    const elements = lastSegment.split("-")
    const pageIdCandidate = elements.pop() || elements.pop()
    if (pageIdCandidate) {
        return pageIdCandidate
    } else {
        throw new Error("cannot get pageId from last segment")
    }
}

function getPageIdByURL(url: URL): string {
    return toPageId(getLastSegment(url))
}
export async function getPageByURL(pageUrl: URL): Promise<Page | undefined> {
    try {
        const pageId = getPageIdByURL(pageUrl);
        const page = await notion.pages.retrieve({
            page_id: pageId
        });
        return page;
    } catch (error) {
        console.error(error);
    }
}

export async function getPageBlocksByURL(pageUrl: URL): Promise<Block[] | undefined> {
    try {
        const pageId = getPageIdByURL(pageUrl);
        const blocks = await notion.blocks.children.list({
            block_id: pageId
        });
        return blocks.results
    } catch (error) {
        console.error(error);
    }
}