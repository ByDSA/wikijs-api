import connection from "#tests/Connection";
import { Connection } from "typeorm";
import PageRepository from ".";

let repo: PageRepository;
let con: Connection;

beforeAll(async () => {
  con = await connection;
  repo = con.getCustomRepository(PageRepository);
} );

afterAll(() => {
  con.close();
} );

describe("find", () => {
  describe("ByContent", () => {
    it("found", async () => {
      const actual = await repo.findInContent("inf");

      expect(actual.length).not.toBe(0);
    } );

    it("not found", async () => {
      const actual = await repo.findInContent("infasdsad");

      expect(actual.length).toBe(0);
    } );
  } );

  describe("ByPathBeginning", () => {
    it("found", async () => {
      const actual = await repo.findByPathBeginning("inf");

      expect(actual.length).not.toBe(0);
    } );

    it("not found", async () => {
      const actual = await repo.findByPathBeginning("lang");

      expect(actual.length).toBe(0);
    } );
  } );
} );

describe("update", () => {
  describe("updateReplaceInContent", () => {
    const from = "(/inf";
    const to = `${from}asjdiasdl`;

    describe("found", () => {
      beforeAll(async () => {
        const pages = await repo.findInContent(to);

        expect(pages.length).toBe(0);
      } );

      afterAll(async () => {
        await repo.updateReplaceInContent(to, from);
      } );

      it("replaced", async () => {
        await repo.updateReplaceInContent(from, to);

        const actualTo = await repo.findInContent(to);

        expect(actualTo.length).not.toBe(0);
      } );
    } );
  } );

  describe("updateReplacePathBeginning", () => {
    const from = "inf";
    const to = `${from}asjdiasdl`;

    describe("found", () => {
      beforeAll(async () => {
        const pages = await repo.findByPathBeginning(to);

        expect(pages.length).toBe(0);
      } );

      afterAll(async () => {
        await repo.updateReplacePathBeginning(to, from);
      } );

      it("replaced", async () => {
        await repo.updateReplacePathBeginning(from, to);

        const actualTo = await repo.findByPathBeginning(to);

        expect(actualTo.length).not.toBe(0);
      } );
    } );
  } );
} );
