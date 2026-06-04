import express from "express";
import cors from "cors";
import "dotenv/config";

import { qcmRouter } from "./router/qcms";
import { PrismaClient } from "@prisma/client";
import { propositionRouter } from "./router/propositions";
import { questionRouter } from "./router/questions";
import { userRouter } from "./router/users";
import { extractUserId } from "./middlewares/extractUserId";

export const prisma = new PrismaClient();

const app = express();

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

app.use("", apiRouter);

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", service: "qcm-service" });
});

apiRouter.use("/qcms", extractUserId, qcmRouter);
apiRouter.use("/results", propositionRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/auth", userRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`QCM API est en cours d'exécution sur le port ${PORT}`);
});
