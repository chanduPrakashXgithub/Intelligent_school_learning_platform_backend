import { ApiResponse } from
    "../../core/http/response.js";

import { loginUser } from "./auth.service.js";


export const login = async (req, res) => {

    const result = await loginUser(
        req.validated.body
    );

    return ApiResponse.success(
        res,
        result
    );
};


export const getCurrentUser = async (req, res) => {

    return ApiResponse.success(
        res,
        {
            user: req.user,
            tenant: req.context
        }
    );
};