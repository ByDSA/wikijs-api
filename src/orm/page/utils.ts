/* eslint-disable no-param-reassign */
import crypto from "crypto";
import { fetchDefaultLangFromSettings } from "../global";
import { UserRepository } from "../user";
import Page from "./Page.entity";

export async function fillWithDefaultValues(page: Partial<Page>) {
  page.localeCode ??= await fetchDefaultLangFromSettings();
  page.title ??= "Untitled";
  page.isPublished ??= true;

  if (!page.author || !page.creator) {
    const userRepo = await UserRepository;
    const users = await userRepo.find( {
      order: {
        id: "ASC",
      },
      take: 1,
    } );
    const user = users[0];

    page.author ??= user;
    page.creator ??= user;
  }

  page.extra ??= {
    js: "",
    css: "",
  };
  page.contentType ??= "markdown";
  page.editorKey ??= page.contentType;
  page.createdAt ??= new Date();
  page.updatedAt ??= page.createdAt;
  page.toc ??= [];
  page.hash ??= generateHash(page as Page);

  return page;
}

export function generateHash(page: Page) {
  return crypto.createHash("sha1")
    .update(`${page.localeCode}|${page.path}|${page.privateNS ?? ""}`)
    .digest("hex");
}
