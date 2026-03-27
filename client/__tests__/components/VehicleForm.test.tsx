import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VehicleForm from "@/components/VehicleForm";

const mockResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  });

type RouteHandler = {
  match: string;
  data?: unknown;
  ok?: boolean;
  error?: unknown;
  method?: string;
};

function mockFetchRoutes(
  fetchSpy: jest.SpyInstance,
  routes: RouteHandler[]
) {
  fetchSpy.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    const method = init?.method ?? "GET";
    const route = routes.find(
      ({ match, method: routeMethod }) =>
        url.includes(match) && (!routeMethod || routeMethod === method)
    );

    if (!route) {
      return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`));
    }

    if (route.error !== undefined) {
      return Promise.reject(route.error);
    }

    return mockResponse(route.data, route.ok);
  });
}

async function selectFordRangerRaptor(user: ReturnType<typeof userEvent.setup>) {
  const makeSelect = await screen.findByLabelText(/Make/i);
  await screen.findByRole("option", { name: "Ford" });
  await user.selectOptions(makeSelect, "ford");

  const modelSelect = await screen.findByLabelText(/Model/i);
  await screen.findByRole("option", { name: "Ranger" });
  await user.selectOptions(modelSelect, "Ranger");

  const badgeSelect = await screen.findByLabelText(/Badge/i);
  await screen.findByRole("option", { name: "Raptor" });
  await user.selectOptions(badgeSelect, "Raptor");

  return { makeSelect };
}

async function selectFordRanger(user: ReturnType<typeof userEvent.setup>) {
  const makeSelect = await screen.findByLabelText(/Make/i);
  await screen.findByRole("option", { name: "Ford" });
  await user.selectOptions(makeSelect, "ford");

  const modelSelect = await screen.findByLabelText(/Model/i);
  await screen.findByRole("option", { name: "Ranger" });
  await user.selectOptions(modelSelect, "Ranger");
}

function uploadViaChange(input: HTMLElement, file: File) {
  fireEvent.change(input, {
    target: {
      files: {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
      },
    },
  });
}

describe("VehicleForm", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle the full user flow successfully", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
      {
        match: "/api/submit",
        method: "POST",
        data: {
          submission: {
            make: "ford",
            model: "Ranger",
            badge: "Raptor",
            logbook: { filename: "logbook.txt", content: "test" },
          },
        },
      },
    ]);

    render(<VehicleForm />);
    await selectFordRangerRaptor(user);

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    await user.upload(
      fileInput,
      new File(["test"], "logbook.txt", { type: "text/plain" })
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(
      await screen.findByText("Submission Successful")
    ).toBeInTheDocument();
    expect(screen.getByText("Logbook — logbook.txt")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("should handle quick select", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["tesla"] } },
      { match: "/api/models?make=tesla", data: { models: ["Model 3"] } },
      {
        match: "/api/badges?make=tesla&model=Model%203",
        data: { badges: ["Performance"] },
      },
    ]);

    render(<VehicleForm />);

    await user.click(
      await screen.findByRole("button", { name: /Tesla Model 3 Performance/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Make/i)).toHaveValue("tesla");
      expect(screen.getByLabelText(/Model/i)).toHaveValue("Model 3");
      expect(screen.getByLabelText(/Badge/i)).toHaveValue("Performance");
    });
  });

  it("should show validation and submission errors", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
      {
        match: "/api/submit",
        method: "POST",
        data: { error: "Server Error" },
        ok: false,
      },
    ]);

    render(<VehicleForm />);

    await user.click(screen.getByRole("button", { name: /Submit/i }));
    expect(
      await screen.findByText("Please select a Make, Model and Badge.")
    ).toBeInTheDocument();

    await selectFordRangerRaptor(user);

    await user.click(screen.getByRole("button", { name: /Submit/i }));
    expect(
      await screen.findByText("Please upload your service logbook (.txt).")
    ).toBeInTheDocument();

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    uploadViaChange(
      fileInput,
      new File([], "image.jpg", { type: "image/jpeg" })
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Please upload your service logbook (.txt).")
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Please select a plain text (.txt) file.")
    ).toBeInTheDocument();

    const refreshedFileInput = await screen.findByLabelText(/Service Logbook/i);
    await user.upload(
      refreshedFileInput,
      new File(["content"], "log.txt", { type: "text/plain" })
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText("Server Error")).toBeInTheDocument();
  });

  it("should show a fallback message when the server omits an error", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
      {
        match: "/api/submit",
        method: "POST",
        data: {},
        ok: false,
      },
    ]);

    render(<VehicleForm />);
    await selectFordRangerRaptor(user);

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    await user.upload(
      fileInput,
      new File(["content"], "log.txt", { type: "text/plain" })
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText("Submission failed")).toBeInTheDocument();
  });

  it("should show a fallback message for unknown submission errors", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
      {
        match: "/api/submit",
        method: "POST",
        error: "network went away",
      },
    ]);

    render(<VehicleForm />);
    await selectFordRangerRaptor(user);

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    await user.upload(
      fileInput,
      new File(["content"], "log.txt", { type: "text/plain" })
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText("Unknown error")).toBeInTheDocument();
  });

  it("should handle API failure when loading makes", async () => {
    mockFetchRoutes(fetchSpy, [{ match: "/api/makes", error: new Error("API is down") }]);

    render(<VehicleForm />);

    expect(
      await screen.findByText("Failed to load makes.")
    ).toBeInTheDocument();
  });

  it("should handle API failure when loading models", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", error: new Error("API is down") },
    ]);

    render(<VehicleForm />);

    const makeSelect = await screen.findByLabelText(/Make/i);
    await screen.findByRole("option", { name: "Ford" });
    await user.selectOptions(makeSelect, "ford");

    expect(
      await screen.findByText("Failed to load models.")
    ).toBeInTheDocument();
  });

  it("should handle API failure when loading badges", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        error: new Error("API is down"),
      },
    ]);

    render(<VehicleForm />);
    await selectFordRanger(user);

    expect(
      await screen.findByText("Failed to load badges.")
    ).toBeInTheDocument();
  });

  it("should render blank make labels without crashing", async () => {
    mockFetchRoutes(fetchSpy, [{ match: "/api/makes", data: { makes: [""] } }]);

    render(<VehicleForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Make/i).querySelectorAll("option")).toHaveLength(2);
    });
  });

  it("should fall back to an empty makes list when the API omits it", async () => {
    mockFetchRoutes(fetchSpy, [{ match: "/api/makes", data: {} }]);

    render(<VehicleForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Make/i).querySelectorAll("option")).toHaveLength(1);
    });
  });

  it("should fall back to an empty models list when the API omits it", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: {} },
    ]);

    render(<VehicleForm />);

    const makeSelect = await screen.findByLabelText(/Make/i);
    await screen.findByRole("option", { name: "Ford" });
    await user.selectOptions(makeSelect, "ford");

    await waitFor(() => {
      expect(screen.getByLabelText(/Model/i)).toHaveValue("");
      expect(screen.queryByRole("option", { name: "Ranger" })).not.toBeInTheDocument();
    });
  });

  it("should fall back to an empty badges list when the API omits it", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      { match: "/api/badges?make=ford&model=Ranger", data: {} },
    ]);

    render(<VehicleForm />);
    await selectFordRanger(user);

    await waitFor(() => {
      expect(screen.getByLabelText(/Badge/i)).toHaveValue("");
      expect(screen.queryByRole("option", { name: "Raptor" })).not.toBeInTheDocument();
    });
  });

  it("should ignore an empty file selection", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
    ]);

    render(<VehicleForm />);
    await selectFordRangerRaptor(user);

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    fireEvent.change(fileInput, {
      target: { files: null },
    });

    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Please select a plain text (.txt) file.")
    ).not.toBeInTheDocument();
  });

  it("should reset the form", async () => {
    const user = userEvent.setup();
    mockFetchRoutes(fetchSpy, [
      { match: "/api/makes", data: { makes: ["ford"] } },
      { match: "/api/models?make=ford", data: { models: ["Ranger"] } },
      {
        match: "/api/badges?make=ford&model=Ranger",
        data: { badges: ["Raptor"] },
      },
    ]);

    render(<VehicleForm />);

    const { makeSelect } = await selectFordRangerRaptor(user);

    const fileInput = await screen.findByLabelText(/Service Logbook/i);
    await user.upload(
      fileInput,
      new File(["test"], "test.txt", { type: "text/plain" })
    );
    expect(await screen.findByText(/Selected:/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Reset/i }));

    await waitFor(() => {
      expect(makeSelect).toHaveValue("");
      expect(
        screen.queryByLabelText(/Service Logbook/i)
      ).not.toBeInTheDocument();
    });
  });
});
