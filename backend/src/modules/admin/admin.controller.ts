import type { RequestHandler } from "express";
import {
  adminApproveReview,
  adminCreateCoupon,
  adminCreateCategory,
  adminGetOrderById,
  adminCreateProduct,
  adminCreateVariant,
  adminDeleteCoupon,
  adminHardDeleteCoupon,
  adminDeleteReview,
  adminDeleteCategory,
  adminGetProductById,
  adminHardDeleteProduct,
  adminHardDeleteVariant,
  adminListHomepage,
  adminListCoupons,
  adminListCategories,
  adminListOrders,
  adminListProducts,
  adminListReviews,
  adminPatchHomepage,
  adminPatchOrderFulfillmentStage,
  adminPatchOrderStatus,
  adminPatchCoupon,
  adminPatchCategory,
  adminPatchProduct,
  adminPatchVariant,
  adminSoftDeleteProduct,
  adminSoftDeleteVariant
} from "./admin.service";
import type {
  AdminApproveReviewValidatedInput,
  AdminCreateCouponValidatedInput,
  AdminCreateCategoryValidatedInput,
  AdminGetOrderByIdValidatedInput,
  AdminCreateProductValidatedInput,
  AdminCreateVariantValidatedInput,
  AdminDeleteCouponValidatedInput,
  AdminHardDeleteCouponValidatedInput,
  AdminDeleteReviewValidatedInput,
  AdminDeleteCategoryValidatedInput,
  AdminDeleteProductValidatedInput,
  AdminHardDeleteProductValidatedInput,
  AdminDeleteVariantValidatedInput,
  AdminHardDeleteVariantValidatedInput,
  AdminGetProductByIdValidatedInput,
  AdminListCouponsValidatedInput,
  AdminListOrdersValidatedInput,
  AdminListProductsValidatedInput,
  AdminListReviewsValidatedInput,
  AdminPatchHomepageValidatedInput,
  AdminPatchOrderFulfillmentStageValidatedInput,
  AdminPatchOrderStatusValidatedInput,
  AdminPatchCouponValidatedInput,
  AdminPatchCategoryValidatedInput,
  AdminPatchProductValidatedInput,
  AdminPatchVariantValidatedInput
} from "./admin.validation";

export const adminListProductsController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as AdminListProductsValidatedInput;
    const result = await adminListProducts(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminGetProductByIdController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminGetProductByIdValidatedInput;
    const result = await adminGetProductById(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminCreateProductController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AdminCreateProductValidatedInput;
    const result = await adminCreateProduct(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchProductController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchProductValidatedInput;
    const result = await adminPatchProduct({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteProductController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminDeleteProductValidatedInput;
    const result = await adminSoftDeleteProduct(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminHardDeleteProductController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminHardDeleteProductValidatedInput;
    const result = await adminHardDeleteProduct({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminCreateVariantController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminCreateVariantValidatedInput;
    const result = await adminCreateVariant({ route: params, payload: body });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchVariantController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchVariantValidatedInput;
    const result = await adminPatchVariant({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteVariantController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminDeleteVariantValidatedInput;
    const result = await adminSoftDeleteVariant({ route: params });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminHardDeleteVariantController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminHardDeleteVariantValidatedInput;
    const result = await adminHardDeleteVariant({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminListCategoriesController: RequestHandler = async (_req, res, next) => {
  try {
    const result = await adminListCategories();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminCreateCategoryController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AdminCreateCategoryValidatedInput;
    const result = await adminCreateCategory(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchCategoryController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchCategoryValidatedInput;
    const result = await adminPatchCategory({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteCategoryController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminDeleteCategoryValidatedInput;
    const result = await adminDeleteCategory(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminListCouponsController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as AdminListCouponsValidatedInput;
    const result = await adminListCoupons(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminCreateCouponController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AdminCreateCouponValidatedInput;
    const result = await adminCreateCoupon(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchCouponController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchCouponValidatedInput;
    const result = await adminPatchCoupon({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteCouponController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminDeleteCouponValidatedInput;
    const result = await adminDeleteCoupon(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminHardDeleteCouponController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminHardDeleteCouponValidatedInput;
    const result = await adminHardDeleteCoupon(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminListReviewsController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as AdminListReviewsValidatedInput;
    const result = await adminListReviews(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminApproveReviewController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminApproveReviewValidatedInput;
    const result = await adminApproveReview(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminDeleteReviewController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminDeleteReviewValidatedInput;
    const result = await adminDeleteReview(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminListOrdersController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as AdminListOrdersValidatedInput;
    const result = await adminListOrders(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminGetOrderByIdController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as AdminGetOrderByIdValidatedInput;
    const result = await adminGetOrderById(params);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchOrderStatusController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchOrderStatusValidatedInput;
    const result = await adminPatchOrderStatus({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchOrderFulfillmentStageController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchOrderFulfillmentStageValidatedInput;
    const result = await adminPatchOrderFulfillmentStage({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminListHomepageController: RequestHandler = async (_req, res, next) => {
  try {
    const result = await adminListHomepage();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const adminPatchHomepageController: RequestHandler = async (req, res, next) => {
  try {
    const { params, body } = req as unknown as AdminPatchHomepageValidatedInput;
    const result = await adminPatchHomepage({ route: params, payload: body });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
