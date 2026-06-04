import { NextFunction, Request, Response } from "express";


export const extractUserId = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers["x-user-id"];

    (req as any).user = { id: userId };

    console.log("User ID extracted:", userId);

    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};