import { Router } from "express";

import {
  CreateProduct,
  createWareHouse,
  createInventory,
  getInventory,
  getWareHouse,
  reserveStock,
  confirmReservation,
  releaseReservation,
} from "../controllers/product.controller";

const router = Router();


router.post("/products",CreateProduct);
router.get("/products",getInventory);
router.post("/warehouses",createWareHouse);
router.get("/warehouses",getWareHouse);
router.post("/inventory",createInventory);
router.post("/reservations",reserveStock);
router.post("/reservations/:id/confirm",confirmReservation);
router.post("/reservations/:id/release",releaseReservation);

export default router;