import { describe, expect, test } from "bun:test";

import { sanitizeBasicHtml } from "@/src/lib/sanitize-basic-html";

describe("sanitizeBasicHtml", () => {
  test("allows basic formatting tags", () => {
    const input = '<p>Hi <strong>Team</strong><br><a href="https://realite.app/e/abc">Event</a></p>';
    const output = sanitizeBasicHtml(input);

    expect(output).toContain("<p>");
    expect(output).toContain("<strong>Team</strong>");
    expect(output).toContain("<br />");
    expect(output).toContain('<a href="https://realite.app/e/abc" target="_blank" rel="noopener noreferrer nofollow">');
  });

  test("escapes disallowed tags and scripts", () => {
    const input = '<script>alert("xss")</script><iframe src="https://evil.example"></iframe>';
    const output = sanitizeBasicHtml(input);

    expect(output).toContain('alert("xss")');
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("<iframe");
  });

  test("drops unsafe link protocols", () => {
    const input = '<a href="javascript:alert(1)">Click</a><a href="/e/test">Safe</a>';
    const output = sanitizeBasicHtml(input);

    expect(output).not.toContain("javascript:");
    expect(output).toContain('href="/e/test"');
  });
});
