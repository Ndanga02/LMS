// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/login-form";

beforeEach(() => {
  HTMLFormElement.prototype.checkValidity = () => true;
  HTMLFormElement.prototype.reportValidity = () => true;
});

const mockSignInWithEmail = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock("@/app/login/actions", () => ({
  signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
});

describe("LoginForm", () => {
  it("should render the welcome heading", () => {
    render(<LoginForm />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("should render email input and submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send magic link" })).toBeInTheDocument();
  });

  it("should show validation error on empty email submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Submit the form directly instead of clicking the submit button to bypass
    // jsdom's incomplete HTML5 form validation handling
    const form = screen.getByRole("button", { name: "Send magic link" }).closest("form")!;
    fireEvent.submit(form);

    expect(screen.getByText("Please enter your email")).toBeInTheDocument();
  });

  it("should show success state after email submission", async () => {
    mockSignInWithEmail.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<LoginForm />);

    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it("should show error message when signIn throws", async () => {
    mockSignInWithEmail.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    render(<LoginForm />);

    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(await screen.findByText("Failed to send magic link. Please try again.")).toBeInTheDocument();
  });

  it("should show error from URL params", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams({ error: "Configuration" }));
    render(<LoginForm />);

    expect(screen.getByText(/Email sign-in is not configured/)).toBeInTheDocument();
  });

  it("should show default error for unknown error codes", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams({ error: "UnknownError" }));
    render(<LoginForm />);

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it("should allow switching email after successful send", async () => {
    mockSignInWithEmail.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<LoginForm />);

    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));
    await screen.findByText("Check your email");

    await user.click(screen.getByText(/use a different email/i));

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send magic link" })).toBeInTheDocument();
  });

  it("should include callbackUrl from search params", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams({ callbackUrl: "/courses" }));
    mockSignInWithEmail.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<LoginForm />);

    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(mockSignInWithEmail).toHaveBeenCalledWith(expect.any(FormData));
    const fd = mockSignInWithEmail.mock.calls[0][0];
    expect(fd.get("callbackUrl")).toBe("/courses");
  });
});
