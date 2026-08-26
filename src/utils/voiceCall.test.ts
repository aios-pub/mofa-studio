/**
 * Tests for CHAT-07's pure core: RMS energy, the VAD utterance-end decision
 * (silence timeout after real speech), and the call state machine including
 * barge-in accounting.
 */
import { describe, expect, it } from "vitest";
import {
  callPhaseLabel,
  callReducer,
  frameRmsDb,
  initialCallState,
  initialVadState,
  vadFrame,
} from "./voiceCall";

describe("frameRmsDb", () => {
  it("measures silence near the floor and speech well above it", () => {
    const silence = new Float32Array(256); // all zeros
    expect(frameRmsDb(silence)).toBeLessThan(-90);

    const speech = new Float32Array(256).fill(0.5);
    expect(frameRmsDb(speech)).toBeCloseTo(-6.02, 1);

    // Empty buffer degrades to the floor instead of -Infinity/NaN.
    expect(frameRmsDb(new Float32Array(0))).toBe(-100);
  });
});

describe("vadFrame", () => {
  const opts = { thresholdMs: 300, minSpeechMs: 100, frameMs: 50 };

  it("ends the utterance only after real speech followed by the silence timeout", () => {
    let state = initialVadState;
    // 3 speech frames (150ms) ≥ minSpeech 2 frames.
    for (let i = 0; i < 3; i++) {
      const out = vadFrame(state, true, opts);
      expect(out.action).toBe("speech");
      state = out.state;
    }
    expect(state.speaking).toBe(true);
    // 5 silence frames = 250ms < 300ms → still continue.
    for (let i = 0; i < 5; i++) {
      const out = vadFrame(state, false, opts);
      expect(out.action).toBe("continue");
      state = out.state;
    }
    // 6th silence frame reaches the timeout.
    const end = vadFrame(state, false, opts);
    expect(end.action).toBe("end-utterance");
  });

  it("pure silence never ends an utterance (nothing was said)", () => {
    let state = initialVadState;
    for (let i = 0; i < 20; i++) {
      const out = vadFrame(state, false, opts);
      expect(out.action).toBe("continue");
      state = out.state;
    }
    expect(state.speaking).toBe(false);
  });

  it("sub-minimum blips are ignored; speech restarts the silence run", () => {
    let state = initialVadState;
    // A single blip frame does not make it speaking (needs 2 consecutive).
    const blip = vadFrame(state, true, opts);
    expect(blip.action).toBe("speech");
    expect(blip.state.speaking).toBe(false);
    state = blip.state;

    // Long silence after a blip still never ends.
    for (let i = 0; i < 10; i++) state = vadFrame(state, false, opts).state;

    // Real speech then silence then speech again resets the silence counter.
    for (let i = 0; i < 3; i++) state = vadFrame(state, true, opts).state;
    for (let i = 0; i < 4; i++) {
      const out = vadFrame(state, false, opts);
      expect(out.action).toBe("continue");
      state = out.state;
    }
    const resumed = vadFrame(state, true, opts);
    expect(resumed.action).toBe("speech");
    expect(resumed.state.silenceFrames).toBe(0);
  });
});

describe("callReducer", () => {
  it("walks the happy loop: dial → utterance → transcript → reply → back to listening", () => {
    let state = callReducer(initialCallState, { type: "dial" });
    expect(state.phase).toBe("listening");

    state = callReducer(state, { type: "utterance-ended" });
    expect(state.phase).toBe("recognizing");

    state = callReducer(state, { type: "transcript", text: "今天天气怎么样" });
    expect(state.phase).toBe("thinking");

    state = callReducer(state, { type: "reply-started" });
    expect(state.phase).toBe("replying");

    state = callReducer(state, { type: "reply-finished" });
    expect(state.phase).toBe("listening");
    expect(state.bargeIns).toBe(0);
  });

  it("empty transcripts fall back to listening without a roundtrip", () => {
    let state = callReducer(initialCallState, { type: "dial" });
    state = callReducer(state, { type: "utterance-ended" });
    state = callReducer(state, { type: "transcript", text: "   " });
    expect(state.phase).toBe("listening");
  });

  it("barge-in interrupts the reply and is counted", () => {
    let state = callReducer(initialCallState, { type: "dial" });
    state = callReducer(state, { type: "reply-started" });
    state = callReducer(state, { type: "barge-in" });
    expect(state.phase).toBe("listening");
    expect(state.bargeIns).toBe(1);
  });

  it("errors recover to listening; hang-up resets the phase", () => {
    let state = callReducer(initialCallState, { type: "dial" });
    state = callReducer(state, { type: "utterance-ended" });
    state = callReducer(state, { type: "error", message: "ASR 不可用" });
    expect(state.phase).toBe("listening");
    expect(state.lastError).toBe("ASR 不可用");

    state = callReducer(state, { type: "hang-up" });
    expect(state.phase).toBe("idle");
  });

  it("labels every phase for the overlay chip", () => {
    expect(callPhaseLabel("listening")).toContain("正在听");
    expect(callPhaseLabel("replying")).toContain("打断");
  });
});
