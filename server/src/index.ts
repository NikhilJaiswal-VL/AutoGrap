import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import { MAKES, getModels, getBadges, MODELS } from "./vehicleData";

const app = express();
const PORT = process.env.PORT || 4000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/plain" || file.originalname.endsWith(".txt")) {
      cb(null, true);
    } else {
      cb(new Error("Only plain text (.txt) files are allowed"));
    }
  },
});

app.use(cors({ origin: "http://localhost:3000" }));
app.options("*", cors());
app.use(express.json());

app.get("/api/makes", (_req: Request, res: Response) => {
  res.json({ makes: MAKES });
});

app.get("/api/models", (req: Request, res: Response) => {
  const make = (req.query.make as string) ?? "";
  if (!make) {
    res.status(400).json({ error: "make query parameter is required" });
    return;
  }
  const models = getModels(make);
  if (!models.length) {
    res.status(404).json({ error: `No models found for make: ${make}` });
    return;
  }
  res.json({ models });
});

app.get("/api/badges", (req: Request, res: Response) => {
  const make = (req.query.make as string) ?? "";
  const model = (req.query.model as string) ?? "";
  if (!make || !model) {
    res
      .status(400)
      .json({ error: "make and model query parameters are required" });
    return;
  }
  const badges = getBadges(make, model);
  if (!badges.length) {
    res.status(404).json({ error: `No badges found for ${make} ${model}` });
    return;
  }
  res.json({ badges });
});

app.get("/api/vehicles", (_req: Request, res: Response) => {
  res.json({ vehicles: MODELS });
});

app.post(
  "/api/submit",
  upload.single("logbook"),
  (req: Request, res: Response) => {
    const { make, model, badge } = req.body as {
      make?: string;
      model?: string;
      badge?: string;
    };

    if (!make || !model || !badge) {
      res.status(400).json({ error: "make, model and badge are required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "A logbook .txt file must be uploaded" });
      return;
    }

    const logbookContent = req.file.buffer.toString("utf-8");

    res.status(200).json({
      success: true,
      submission: {
        make,
        model,
        badge,
        logbook: {
          filename: req.file.originalname,
          content: logbookContent,
        },
      },
    });
  }
);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀  AutoGrab API server running at http://localhost:${PORT}`);
});

export default app;
