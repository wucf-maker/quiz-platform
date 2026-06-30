import { describe, expect, it } from "vitest";

// Test the grading logic directly (extracted for testability)
function gradeAnswer(
  questionType: string,
  correctAnswer: unknown,
  studentAnswer: unknown
): boolean {
  if (studentAnswer === null || studentAnswer === undefined) return false;

  if (questionType === "single_choice" || questionType === "picture_choice") {
    return String(correctAnswer) === String(studentAnswer);
  }

  if (questionType === "fill_blank") {
    const correct = Array.isArray(correctAnswer)
      ? correctAnswer.map((s: unknown) => String(s).trim().toLowerCase())
      : [String(correctAnswer).trim().toLowerCase()];
    const student = String(studentAnswer).trim().toLowerCase();
    return correct.includes(student);
  }

  if (questionType === "matching") {
    if (!Array.isArray(correctAnswer) || !Array.isArray(studentAnswer)) return false;
    const correct = correctAnswer as { leftId: string; rightId: string }[];
    const student = studentAnswer as { leftId: string; rightId: string }[];
    if (correct.length !== student.length) return false;
    return correct.every((c) =>
      student.some((s) => s.leftId === c.leftId && s.rightId === c.rightId)
    );
  }

  return false;
}

describe("gradeAnswer - single_choice", () => {
  it("returns true for correct answer", () => {
    expect(gradeAnswer("single_choice", "opt1", "opt1")).toBe(true);
  });

  it("returns false for wrong answer", () => {
    expect(gradeAnswer("single_choice", "opt1", "opt2")).toBe(false);
  });

  it("returns false for null answer", () => {
    expect(gradeAnswer("single_choice", "opt1", null)).toBe(false);
  });
});

describe("gradeAnswer - fill_blank", () => {
  it("returns true for exact match (case insensitive)", () => {
    expect(gradeAnswer("fill_blank", "Apple", "apple")).toBe(true);
    expect(gradeAnswer("fill_blank", "Apple", "APPLE")).toBe(true);
  });

  it("returns true for trimmed whitespace", () => {
    expect(gradeAnswer("fill_blank", "apple", "  apple  ")).toBe(true);
  });

  it("returns false for wrong answer", () => {
    expect(gradeAnswer("fill_blank", "apple", "orange")).toBe(false);
  });

  it("accepts multiple correct answers", () => {
    expect(gradeAnswer("fill_blank", ["apple", "蘋果"], "蘋果")).toBe(true);
    expect(gradeAnswer("fill_blank", ["apple", "蘋果"], "apple")).toBe(true);
    expect(gradeAnswer("fill_blank", ["apple", "蘋果"], "banana")).toBe(false);
  });
});

describe("gradeAnswer - matching", () => {
  it("returns true for correct matching", () => {
    const correct = [
      { leftId: "a", rightId: "a" },
      { leftId: "b", rightId: "b" },
    ];
    const student = [
      { leftId: "b", rightId: "b" },
      { leftId: "a", rightId: "a" },
    ];
    expect(gradeAnswer("matching", correct, student)).toBe(true);
  });

  it("returns false for wrong matching", () => {
    const correct = [
      { leftId: "a", rightId: "a" },
      { leftId: "b", rightId: "b" },
    ];
    const student = [
      { leftId: "a", rightId: "b" },
      { leftId: "b", rightId: "a" },
    ];
    expect(gradeAnswer("matching", correct, student)).toBe(false);
  });

  it("returns false for incomplete matching", () => {
    const correct = [
      { leftId: "a", rightId: "a" },
      { leftId: "b", rightId: "b" },
    ];
    const student = [{ leftId: "a", rightId: "a" }];
    expect(gradeAnswer("matching", correct, student)).toBe(false);
  });
});

describe("gradeAnswer - picture_choice", () => {
  it("returns true for correct picture option", () => {
    expect(gradeAnswer("picture_choice", "pic_opt2", "pic_opt2")).toBe(true);
  });

  it("returns false for wrong picture option", () => {
    expect(gradeAnswer("picture_choice", "pic_opt2", "pic_opt1")).toBe(false);
  });
});
