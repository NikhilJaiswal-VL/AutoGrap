type JsonValue = Record<string, unknown>;
type ResponseMock = {
  status: jest.Mock<ResponseMock, [number]>;
  json: jest.Mock<ResponseMock, [JsonValue]>;
};
type RouteHandler = (req: Record<string, unknown>, res: ResponseMock) => void;
type ErrorHandler = (
  err: Error,
  req: Record<string, unknown>,
  res: ResponseMock,
  next: () => void
) => void;

describe("server bootstrap and route handlers", () => {
  let registeredGetHandlers: Record<string, RouteHandler>;
  let submitHandler: RouteHandler;
  let errorHandler: ErrorHandler;
  let multerOptions: {
    fileFilter: (
      req: unknown,
      file: { mimetype: string; originalname: string },
      cb: (error: Error | null, accepted?: boolean) => void
    ) => void;
  };
  let expressJsonMock: jest.Mock;
  let corsMock: jest.Mock;
  let multerMock: jest.Mock;
  let memoryStorageMock: jest.Mock;
  let singleMock: jest.Mock;
  let appMock: {
    use: jest.Mock;
    options: jest.Mock;
    get: jest.Mock;
    post: jest.Mock;
    listen: jest.Mock;
  };
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  function createResponse(): ResponseMock {
    const response = {} as ResponseMock;
    response.status = jest
      .fn()
      .mockImplementation((_code: number) => response) as ResponseMock["status"];
    response.json = jest
      .fn()
      .mockImplementation((_payload: JsonValue) => response) as ResponseMock["json"];
    return response;
  }

  beforeEach(() => {
    jest.resetModules();
    registeredGetHandlers = {};
    submitHandler = jest.fn() as unknown as RouteHandler;
    errorHandler = jest.fn() as unknown as ErrorHandler;

    expressJsonMock = jest.fn(() => "json-middleware");
    corsMock = jest.fn(() => "cors-middleware");
    memoryStorageMock = jest.fn(() => "memory-storage");
    singleMock = jest.fn(() => "upload-middleware");

    appMock = {
      use: jest.fn((handler: unknown) => {
        if (typeof handler === "function" && handler.length === 4) {
          errorHandler = handler as ErrorHandler;
        }
        return appMock;
      }),
      options: jest.fn(() => appMock),
      get: jest.fn((path: string, handler: RouteHandler) => {
        registeredGetHandlers[path] = handler;
        return appMock;
      }),
      post: jest.fn((path: string, middleware: unknown, handler: RouteHandler) => {
        expect(path).toBe("/api/submit");
        expect(middleware).toBe("upload-middleware");
        submitHandler = handler;
        return appMock;
      }),
      listen: jest.fn((port: number | string, callback?: () => void) => {
        callback?.();
        return appMock;
      }),
    };

    multerMock = jest.fn((options) => {
      multerOptions = options;
      return { single: singleMock };
    });
    (multerMock as unknown as { memoryStorage: jest.Mock }).memoryStorage =
      memoryStorageMock;

    jest.doMock("express", () => {
      const expressFactory = jest.fn(() => appMock);
      (
        expressFactory as unknown as {
          json: jest.Mock;
        }
      ).json = expressJsonMock;

      return {
        __esModule: true,
        default: expressFactory,
      };
    });
    jest.doMock("cors", () => ({
      __esModule: true,
      default: corsMock,
    }));
    jest.doMock("multer", () => ({
      __esModule: true,
      default: multerMock,
    }));

    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    jest.isolateModules(() => {
      require("../index");
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("boots the express app with middleware, routes, and a listener", () => {
    expect(corsMock).toHaveBeenNthCalledWith(1, { origin: "http://localhost:3000" });
    expect(corsMock).toHaveBeenNthCalledWith(2);
    expect(appMock.options).toHaveBeenCalledWith("*", "cors-middleware");
    expect(expressJsonMock).toHaveBeenCalled();
    expect(memoryStorageMock).toHaveBeenCalled();
    expect(multerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storage: "memory-storage",
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: expect.any(Function),
      })
    );
    expect(singleMock).toHaveBeenCalledWith("logbook");
    expect(appMock.listen).toHaveBeenCalledWith(4000, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith(
      "🚀  AutoGrab API server running at http://localhost:4000"
    );
  });

  it("returns makes", () => {
    const response = createResponse();

    registeredGetHandlers["/api/makes"]({}, response);

    expect(response.json).toHaveBeenCalledWith({
      makes: ["ford", "bmw", "tesla"],
    });
  });

  it("returns models for a valid make", () => {
    const response = createResponse();

    registeredGetHandlers["/api/models"]({ query: { make: "Ford" } }, response);

    expect(response.json).toHaveBeenCalledWith({
      models: ["Ranger", "Falcon", "Falcon Ute"],
    });
  });

  it("returns 400 when the make query parameter is missing", () => {
    const response = createResponse();

    registeredGetHandlers["/api/models"]({ query: {} }, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "make query parameter is required",
    });
  });

  it("returns 404 when a make has no models", () => {
    const response = createResponse();

    registeredGetHandlers["/api/models"]({ query: { make: "audi" } }, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "No models found for make: audi",
    });
  });

  it("returns badges for a valid make and model", () => {
    const response = createResponse();

    registeredGetHandlers["/api/badges"](
      { query: { make: "tesla", model: "Model 3" } },
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      badges: ["Performance", "Long Range", "Dual Motor"],
    });
  });

  it("returns 400 when badge params are missing", () => {
    const response = createResponse();

    registeredGetHandlers["/api/badges"]({ query: { make: "ford" } }, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "make and model query parameters are required",
    });
  });

  it("treats a null make query as missing for badges", () => {
    const response = createResponse();

    registeredGetHandlers["/api/badges"](
      { query: { make: null, model: "Model 3" } },
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "make and model query parameters are required",
    });
  });

  it("returns 404 when a model has no badges", () => {
    const response = createResponse();

    registeredGetHandlers["/api/badges"](
      { query: { make: "ford", model: "Territory" } },
      response
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "No badges found for ford Territory",
    });
  });

  it("returns all vehicles", () => {
    const response = createResponse();

    registeredGetHandlers["/api/vehicles"]({}, response);

    expect(response.json).toHaveBeenCalledWith({
      vehicles: expect.objectContaining({
        ford: expect.any(Object),
        bmw: expect.any(Object),
        tesla: expect.any(Object),
      }),
    });
  });

  it("accepts plain text uploads in the multer file filter", () => {
    const callback = jest.fn();

    multerOptions.fileFilter(
      {},
      { mimetype: "text/plain", originalname: "logbook.log" },
      callback
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("accepts .txt uploads even with a non-text mime type", () => {
    const callback = jest.fn();

    multerOptions.fileFilter(
      {},
      { mimetype: "application/octet-stream", originalname: "logbook.txt" },
      callback
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("rejects invalid upload types in the multer file filter", () => {
    const callback = jest.fn();

    multerOptions.fileFilter(
      {},
      { mimetype: "application/json", originalname: "logbook.json" },
      callback
    );

    expect(callback).toHaveBeenCalledWith(
      new Error("Only plain text (.txt) files are allowed")
    );
  });

  it("returns 400 when submission fields are missing", () => {
    const response = createResponse();

    submitHandler(
      {
        body: { make: "ford" },
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "make, model and badge are required",
    });
  });

  it("returns 400 when the logbook file is missing", () => {
    const response = createResponse();

    submitHandler(
      {
        body: { make: "ford", model: "Ranger", badge: "Raptor" },
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "A logbook .txt file must be uploaded",
    });
  });

  it("returns the submitted payload for a valid upload", () => {
    const response = createResponse();

    submitHandler(
      {
        body: { make: "ford", model: "Ranger", badge: "Raptor" },
        file: {
          originalname: "logbook.txt",
          buffer: Buffer.from("service history"),
        },
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      submission: {
        make: "ford",
        model: "Ranger",
        badge: "Raptor",
        logbook: {
          filename: "logbook.txt",
          content: "service history",
        },
      },
    });
  });

  it("returns 500 from the error middleware", () => {
    const response = createResponse();
    const next = jest.fn();

    errorHandler(new Error("Only plain text (.txt) files are allowed"), {}, response, next);

    expect(errorSpy).toHaveBeenCalledWith("Only plain text (.txt) files are allowed");
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: "Only plain text (.txt) files are allowed",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
