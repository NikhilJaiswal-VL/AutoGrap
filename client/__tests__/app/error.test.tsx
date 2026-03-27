import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorComponent from "@/app/error";

describe("Error Component", () => {
  it("should render the error message and allow retrying", async () => {
    const mockReset = jest.fn();
    const testError = new Error("Test error");

    render(<ErrorComponent error={testError} reset={mockReset} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
