import express from "express";
import proveParamCount from "../controllers/proveParamCountController.js";

const router = express.Router();

router.post("/param-count", proveParamCount);

export default router;

