// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizPlayer } from "@/components/quiz-player";

const mockSubmitAction = vi.fn();

vi.mock("@/app/actions/retention", () => ({
  submitQuizAttemptAction: (...args: any[]) => mockSubmitAction(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const question1 = { id: "q1", question: "What is 2+2?", options: ["3", "4", "5", "6"], order: 1 };
const question2 = { id: "q2", question: "What is 3+3?", options: ["5", "6", "7", "8"], order: 2 };
const defaultProps = {
  quizId: "quiz-1",
  lessonId: "lesson-1",
  questions: [question1, question2],
  tenantSlug: "test-org",
  courseSlug: "math-101",
  passingScore: 66,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("QuizPlayer", () => {
  it("should render all questions", () => {
    render(<QuizPlayer {...defaultProps} />);
    expect(screen.getByText("1. What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText("2. What is 3+3?")).toBeInTheDocument();
  });

  it("should render all options for each question", () => {
    render(<QuizPlayer {...defaultProps} />);
    expect(screen.getAllByText("4")).toHaveLength(1);
    expect(screen.getAllByText("6")).toHaveLength(2); // q1.option[1] = 4, q2.option[1] = 6
  });

  it("should disable submit button when not all questions answered", () => {
    render(<QuizPlayer {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /submit answers/i });
    expect(btn).toBeDisabled();
  });

  it("should enable submit button when all questions answered", async () => {
    const user = userEvent.setup();
    render(<QuizPlayer {...defaultProps} />);

    // Answer q1: click "4" (option 1)
    await user.click(screen.getAllByText("4")[0]);
    // Answer q2: click "6" (option 1 of q2)
    await user.click(screen.getAllByText("6")[1]);

    const btn = screen.getByRole("button", { name: /submit answers/i });
    expect(btn).not.toBeDisabled();
  });

  it("should show result screen after submission", async () => {
    mockSubmitAction.mockResolvedValue({ score: 100, passed: true });

    const user = userEvent.setup();
    render(<QuizPlayer {...defaultProps} />);

    await user.click(screen.getAllByText("4")[0]); // answer q1
    await user.click(screen.getAllByText("6")[1]); // answer q2
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getByText("You passed!")).toBeInTheDocument();
  });

  it("should show fail message when score is below passing", async () => {
    mockSubmitAction.mockResolvedValue({ score: 50, passed: false });

    const user = userEvent.setup();
    render(<QuizPlayer {...defaultProps} />);

    await user.click(screen.getAllByText("4")[0]);
    await user.click(screen.getAllByText("6")[1]);
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/passing score: 66%/i)).toBeInTheDocument();
  });

  it("should call onPassed callback when quiz is passed", async () => {
    const onPassed = vi.fn();
    mockSubmitAction.mockResolvedValue({ score: 100, passed: true });

    const user = userEvent.setup();
    render(<QuizPlayer {...defaultProps} onPassed={onPassed} />);

    await user.click(screen.getAllByText("4")[0]);
    await user.click(screen.getAllByText("6")[1]);
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    await screen.findByText("100%");
    expect(onPassed).toHaveBeenCalled();
  });

  it("should show questions in order", () => {
    const reversed = [question2, question1];
    render(<QuizPlayer {...defaultProps} questions={reversed} />);

    const questions = screen.getAllByText(/what is/i);
    expect(questions[0]).toHaveTextContent("2+2");
    expect(questions[1]).toHaveTextContent("3+3");
  });

  it("should highlight selected option", async () => {
    const user = userEvent.setup();
    render(<QuizPlayer {...defaultProps} />);

    const option = screen.getAllByText("4")[0];
    await user.click(option);

    expect(option.closest("button")).toHaveClass("border-primary");
  });
});
