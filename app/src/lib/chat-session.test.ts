import { describe, expect, it } from "vitest";
import {
  CHAT_SESSION_COOKIE_NAME,
  createChatSessionId,
  isValidSessionId,
  parseChatSessionCookie,
} from "./chat-session";

describe("parseChatSessionCookie", () => {
  it("returns null for an empty cookie value", () => {
    expect(parseChatSessionCookie("")).toBeNull();
  });

  it("returns null for an invalid session id", () => {
    expect(parseChatSessionCookie("not-a-uuid")).toBeNull();
  });

  it("returns the session id for a valid cookie value", () => {
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";

    expect(parseChatSessionCookie(sessionId)).toBe(sessionId);
  });
});

describe("isValidSessionId", () => {
  it("accepts uuid values", () => {
    expect(isValidSessionId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects non-uuid values", () => {
    expect(isValidSessionId("session-123")).toBe(false);
  });
});

describe("CHAT_SESSION_COOKIE_NAME", () => {
  it("uses a stable cookie name for anonymous chat sessions", () => {
    expect(CHAT_SESSION_COOKIE_NAME).toBe("finance_agent_chat_session");
  });
});

describe("createChatSessionId", () => {
  it("creates a uuid for new anonymous sessions", () => {
    expect(isValidSessionId(createChatSessionId())).toBe(true);
  });
});
