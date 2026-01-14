import express from "express";
const router = express.Router();

// ✅ Import the controller that ACTUALLY exists
import { proveFromWalrusController } from "../controllers/proveFromWalrusController.js";

/**
 * POST /proof/juvenile-diabetes/under18/count
 *
 * This route simply delegates to the existing
 * proveFromWalrusController, which:
 * - reads from Walrus
 * - generates witness
 * - generates ZK proof
 * - returns the result
 */
router.post(
  "/juvenile-diabetes/under18/count",
  proveFromWalrusController
);

export default router;
