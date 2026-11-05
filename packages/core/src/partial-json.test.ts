import { describe, expect, it } from "vitest";
import { parsePartialJson } from "./partial-json";

describe("parsePartialJson", () => {
  const event = '{"events":[{"title":"Stand-up","day":"Tue","start":"09:30"},{"title":"Design review","day":"Thu","start":"14:00","notes":"Bring the \\"v2\\" mocks"}]}';

  it("returns every prefix as a usable value that only grows", () => {
    let fields = 0;
    for (let cut = 1; cut <= event.length; cut++) {
      const value = parsePartialJson(event.slice(0, cut)) as { events?: Record<string, string>[] } | undefined;
      if (value === undefined) continue;
      const count = (value.events ?? []).reduce((sum, e) => sum + Object.keys(e).length, 0);
      expect(count).toBeGreaterThanOrEqual(fields - 1); // a key may only appear once its value starts
      fields = Math.max(fields, count);
    }
    expect(parsePartialJson(event)).toEqual(JSON.parse(event));
  });

  it("cuts an open string where the text ends", () => {
    expect(parsePartialJson('{"title":"Stand')).toEqual({ title: "Stand" });
    expect(parsePartialJson('{"code":"line1\\nli')).toEqual({ code: "line1\nli" });
  });

  it("leaves out a key whose value has not started, and half-written escapes and literals", () => {
    expect(parsePartialJson('{"a":1,"b')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":1,"b":')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":"x\\')).toEqual({ a: "x" });
    expect(parsePartialJson('{"a":"x\\u00')).toEqual({ a: "x" });
    expect(parsePartialJson('{"a":1,"b":tr')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":[1,2')).toEqual({ a: [1, 2] });
  });

  it("is undefined before anything usable arrives", () => {
    expect(parsePartialJson("")).toBeUndefined();
    expect(parsePartialJson("  ")).toBeUndefined();
    expect(parsePartialJson('{"ti')).toEqual({});
  });
});
