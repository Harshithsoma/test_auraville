import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import { adminRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  adminApproveReviewController,
  adminGetOrderByIdController,
  adminCreateCouponController,
  adminCreateCategoryController,
  adminCreateProductController,
  adminCreateVariantController,
  adminDeleteCouponController,
  adminHardDeleteCouponController,
  adminDeleteReviewController,
  adminDeleteCategoryController,
  adminDeleteProductController,
  adminHardDeleteProductController,
  adminDeleteVariantController,
  adminHardDeleteVariantController,
  adminGetProductByIdController,
  adminListHomepageController,
  adminListCouponsController,
  adminListCategoriesController,
  adminListOrdersController,
  adminListProductsController,
  adminListReviewsController,
  adminPatchHomepageController,
  adminPatchOrderFulfillmentStageController,
  adminPatchOrderStatusController,
  adminPatchCouponController,
  adminPatchCategoryController,
  adminPatchProductController,
  adminPatchVariantController
} from "./admin.controller";
import {
  adminApproveReviewSchema,
  adminGetOrderByIdSchema,
  adminCreateCouponSchema,
  adminCreateCategorySchema,
  adminCreateProductSchema,
  adminCreateVariantSchema,
  adminDeleteCouponSchema,
  adminHardDeleteCouponSchema,
  adminDeleteReviewSchema,
  adminDeleteCategorySchema,
  adminDeleteProductSchema,
  adminHardDeleteProductSchema,
  adminDeleteVariantSchema,
  adminHardDeleteVariantSchema,
  adminGetProductByIdSchema,
  adminListHomepageSchema,
  adminListCouponsSchema,
  adminListCategoriesSchema,
  adminListOrdersSchema,
  adminListProductsSchema,
  adminListReviewsSchema,
  adminPatchHomepageSchema,
  adminPatchOrderFulfillmentStageSchema,
  adminPatchOrderStatusSchema,
  adminPatchCouponSchema,
  adminPatchCategorySchema,
  adminPatchProductSchema,
  adminPatchVariantSchema
} from "./admin.validation";

export const adminRouter = Router();

adminRouter.use("/admin", adminRateLimiter, requireAuth, requireAdmin);

adminRouter.get("/admin/products", validateRequest(adminListProductsSchema), adminListProductsController);
adminRouter.get("/admin/products/:id", validateRequest(adminGetProductByIdSchema), adminGetProductByIdController);
adminRouter.post("/admin/products", validateRequest(adminCreateProductSchema), adminCreateProductController);
adminRouter.patch("/admin/products/:id", validateRequest(adminPatchProductSchema), adminPatchProductController);
adminRouter.delete(
  "/admin/products/:id",
  validateRequest(adminDeleteProductSchema),
  adminDeleteProductController
);
adminRouter.delete(
  "/admin/products/:id/permanent",
  validateRequest(adminHardDeleteProductSchema),
  adminHardDeleteProductController
);

adminRouter.post(
  "/admin/products/:id/variants",
  validateRequest(adminCreateVariantSchema),
  adminCreateVariantController
);
adminRouter.patch(
  "/admin/products/:id/variants/:variantId",
  validateRequest(adminPatchVariantSchema),
  adminPatchVariantController
);
adminRouter.delete(
  "/admin/products/:id/variants/:variantId",
  validateRequest(adminDeleteVariantSchema),
  adminDeleteVariantController
);
adminRouter.delete(
  "/admin/products/:id/variants/:variantId/permanent",
  validateRequest(adminHardDeleteVariantSchema),
  adminHardDeleteVariantController
);

adminRouter.get("/admin/categories", validateRequest(adminListCategoriesSchema), adminListCategoriesController);
adminRouter.post("/admin/categories", validateRequest(adminCreateCategorySchema), adminCreateCategoryController);
adminRouter.patch(
  "/admin/categories/:id",
  validateRequest(adminPatchCategorySchema),
  adminPatchCategoryController
);
adminRouter.delete(
  "/admin/categories/:id",
  validateRequest(adminDeleteCategorySchema),
  adminDeleteCategoryController
);

adminRouter.get("/admin/coupons", validateRequest(adminListCouponsSchema), adminListCouponsController);
adminRouter.post("/admin/coupons", validateRequest(adminCreateCouponSchema), adminCreateCouponController);
adminRouter.patch(
  "/admin/coupons/:id",
  validateRequest(adminPatchCouponSchema),
  adminPatchCouponController
);
adminRouter.delete(
  "/admin/coupons/:id",
  validateRequest(adminDeleteCouponSchema),
  adminDeleteCouponController
);
adminRouter.delete(
  "/admin/coupons/:id/permanent",
  validateRequest(adminHardDeleteCouponSchema),
  adminHardDeleteCouponController
);

adminRouter.get("/admin/reviews", validateRequest(adminListReviewsSchema), adminListReviewsController);
adminRouter.patch(
  "/admin/reviews/:id/approve",
  validateRequest(adminApproveReviewSchema),
  adminApproveReviewController
);
adminRouter.delete(
  "/admin/reviews/:id",
  validateRequest(adminDeleteReviewSchema),
  adminDeleteReviewController
);

adminRouter.get("/admin/orders", validateRequest(adminListOrdersSchema), adminListOrdersController);
adminRouter.get("/admin/orders/:id", validateRequest(adminGetOrderByIdSchema), adminGetOrderByIdController);
adminRouter.patch(
  "/admin/orders/:id/status",
  validateRequest(adminPatchOrderStatusSchema),
  adminPatchOrderStatusController
);
adminRouter.patch(
  "/admin/orders/:id/fulfillment-stage",
  validateRequest(adminPatchOrderFulfillmentStageSchema),
  adminPatchOrderFulfillmentStageController
);

adminRouter.get("/admin/homepage", validateRequest(adminListHomepageSchema), adminListHomepageController);
adminRouter.patch(
  "/admin/homepage/:key",
  validateRequest(adminPatchHomepageSchema),
  adminPatchHomepageController
);
