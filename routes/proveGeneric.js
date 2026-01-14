// routes/proveGeneric.js
import express from "express";
import { proveGenericCount } from "../controllers/proveGenericCountController.js";

const router = express.Router();

/**
 * POST /proof/generic-count
 */
router.post("/generic-count", proveGenericCount);

export default router;
