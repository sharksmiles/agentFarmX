import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * 验证错误响应
 */
function validationError(errors: z.ZodIssue[]): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * 请求验证中间件
 * 使用Zod schema验证请求体
 */
export function withValidation<T>(schema: ZodSchema<T>) {
  return function (
    handler: (
      request: NextRequest,
      context: { params: Record<string, string>; body: T }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<NextResponse> => {
      try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
          return validationError(result.error.errors);
        }

        return handler(request, { ...context, body: result.data });
      } catch (error) {
        if (error instanceof SyntaxError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid JSON body',
              code: 'INVALID_JSON',
            },
            { status: 400 }
          );
        }
        throw error;
      }
    };
  };
}

/**
 * 查询参数验证中间件
 */
export function withQueryValidation<T>(schema: ZodSchema<T>) {
  return function (
    handler: (
      request: NextRequest,
      context: { params: Record<string, string>; query: T }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<NextResponse> => {
      try {
        const { searchParams } = new URL(request.url);
        const queryObj: Record<string, string> = {};
        
        searchParams.forEach((value, key) => {
          queryObj[key] = value;
        });

        const result = schema.safeParse(queryObj);

        if (!result.success) {
          return validationError(result.error.errors);
        }

        return handler(request, { ...context, query: result.data });
      } catch (error) {
        throw error;
      }
    };
  };
}

/**
 * 组合验证：同时验证body和query
 */
export function withFullValidation<TBody, TQuery>(
  bodySchema: ZodSchema<TBody>,
  querySchema: ZodSchema<TQuery>
) {
  return function (
    handler: (
      request: NextRequest,
      context: { params: Record<string, string>; body: TBody; query: TQuery }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<NextResponse> => {
      try {
        // 验证body
        const body = await request.json();
        const bodyResult = bodySchema.safeParse(body);

        if (!bodyResult.success) {
          return validationError(bodyResult.error.errors);
        }

        // 验证query
        const { searchParams } = new URL(request.url);
        const queryObj: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          queryObj[key] = value;
        });

        const queryResult = querySchema.safeParse(queryObj);

        if (!queryResult.success) {
          return validationError(queryResult.error.errors);
        }

        return handler(request, {
          ...context,
          body: bodyResult.data,
          query: queryResult.data,
        });
      } catch (error) {
        if (error instanceof SyntaxError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid JSON body',
              code: 'INVALID_JSON',
            },
            { status: 400 }
          );
        }
        throw error;
      }
    };
  };
}

/**
 * 常用验证Schema
 */
export const commonSchemas = {
  userId: z.string().cuid(),
  agentId: z.string().cuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  plotIndex: z.number().int().min(0).max(35),
  cropId: z.string().min(1).max(50),
  pagination: z.object({
    page: z.string().transform(v => parseInt(v) || 1),
    pageSize: z.string().transform(v => Math.min(parseInt(v) || 20, 100)),
  }),
};

/**
 * 创建分页Schema
 */
export function createPaginationSchema(defaultPageSize: number = 20, maxPageSize: number = 100) {
  return z.object({
    page: z.string().optional().default('1').transform(v => parseInt(v) || 1),
    pageSize: z.string().optional().default(String(defaultPageSize)).transform(v => 
      Math.min(parseInt(v) || defaultPageSize, maxPageSize)
    ),
  });
}
