import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { listHomepageSectionsController } from "./homepage.controller";
import { listHomepageSectionsSchema } from "./homepage.validation";

export const homepageRouter = Router();

homepageRouter.get("/homepage", validateRequest(listHomepageSectionsSchema), listHomepageSectionsController);
