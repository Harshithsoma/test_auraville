import type { RequestHandler } from "express";
import { prisma } from "../prisma/prisma.service";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/http-error";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name: string | null;
  phone: string | null;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true
      }
    });

    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone
    };

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(401, "Unauthorized"));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.authUser) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }

  if (req.authUser.role !== "ADMIN") {
    next(new HttpError(403, "Forbidden", undefined, "FORBIDDEN"));
    return;
  }

  next();
};

export const attachOptionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true
      }
    });

    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone
    };

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(401, "Unauthorized"));
  }
};
