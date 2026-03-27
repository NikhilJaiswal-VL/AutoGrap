import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

jest.mock("@/components/VehicleForm", () => ({
  __esModule: true,
  default: () => <div>VehicleForm</div>,
}));

describe("Home Page", () => {
  it("renders the VehicleForm component", () => {
    render(<Home />);
    expect(screen.getByText("VehicleForm")).toBeInTheDocument();
  });
});
