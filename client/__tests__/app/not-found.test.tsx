import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("Not Found Component", () => {
  it("should render the not found message and a link to the home page", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "404 – Page Not Found" })
    ).toBeInTheDocument();

    const homeLink = screen.getByRole("link", {
      name: "Return to Vehicle Selector",
    });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
