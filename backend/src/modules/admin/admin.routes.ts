import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  adminApproveReviewController,
  adminGetOrderByIdController,
  adminCreateCouponController,
  adminCreateCategoryController,
  adminCreateProductController,
  adminCreateVariantController,
  adminDeleteCouponController,
  adminDeleteReviewController,
  adminDeleteCategoryController,
  adminDeleteProductController,
  adminDeleteVariantController,
  adminGetProductByIdController,
  adminListHomepageController,
  adminListCouponsController,
  adminListCategoriesController,
  adminListOrdersController,
  adminListProductsController,
  adminListReviewsController,
  adminPatchHomepageController,
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
  adminDeleteReviewSchema,
  adminDeleteCategorySchema,
  adminDeleteProductSchema,
  adminDeleteVariantSchema,
  adminGetProductByIdSchema,
  adminListHomepageSchema,
  adminListCouponsSchema,
  adminListCategoriesSchema,
  adminListOrdersSchema,
  adminListProductsSchema,
  adminListReviewsSchema,
  adminPatchHomepageSchema,
  adminPatchOrderStatusSchema,
  adminPatchCouponSchema,
  adminPatchCategorySchema,
  adminPatchProductSchema,
  adminPatchVariantSchema
} from "./admin.validation";

export const adminRouter = Router();

adminRouter.use("/admin", requireAuth, requireAdmin);

adminRouter.get("/admin/products", validateRequest(adminListProductsSchema), adminListProductsController);
adminRouter.get("/admin/products/:id", validateRequest(adminGetProductByIdSchema), adminGetProductByIdController);
adminRouter.post("/admin/products", validateRequest(adminCreateProductSchema), adminCreateProductController);
adminRouter.patch("/admin/products/:id", validateRequest(adminPatchProductSchema), adminPatchProductController);
adminRouter.delete(
  "/admin/products/:id",
  validateRequest(adminDeleteProductSchema),
  adminDeleteProductController
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

adminRouter.get("/admin/homepage", validateRequest(adminListHomepageSchema), adminListHomepageController);
adminRouter.patch(
  "/admin/homepage/:key",
  validateRequest(adminPatchHomepageSchema),
  adminPatchHomepageController
);
