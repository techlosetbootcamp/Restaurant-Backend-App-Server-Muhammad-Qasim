import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { GraphQLError } from "graphql";
import { isAuth } from "../middleware/isAuth";
import { GraphQLContext } from "../types/types";
import { Cart, CustomCartItemInput } from "../../prisma/generated/type-graphql";

@Resolver()
@UseMiddleware(isAuth)
export class CartResolver {
  @Mutation(() => String)
  async createCart(
    @Ctx() { prisma, user }: GraphQLContext,
    @Arg("cartItems", () => [CustomCartItemInput])
    cartItems: CustomCartItemInput[]
  ): Promise<string> {
    try {
      if (!user || !user?.id) {
        throw new GraphQLError("User not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }

      const newCart = await prisma.cart.create({
        data: {
          userId: user?.id,
          cartItems: {
            create: cartItems?.map(({ itemId, quantity = 1 }) => ({
              menuItem: { connect: { id: itemId } },
              quantity,
            })),
          },
        },
      });

      return `Cart created successfully with ID: ${newCart?.id}`;
    } catch (error: any) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          http: error.extensions?.http || {
            status: 500,
          },
          originalError: error,
        },
      });
    }
  }

  @Query(() => Cart, { nullable: true })
  async getCart(@Ctx() { prisma, user }: GraphQLContext): Promise<Cart | null> {
    try {
      if (!user || !user?.id) {
        throw new GraphQLError("User not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }

      return await prisma.cart.findUnique({
        where: { userId: user?.id },
        include: { cartItems: true },
      });
    } catch (error: any) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          http: error.extensions?.http || {
            status: 500,
          },
          originalError: error,
        },
      });
    }
  }

  @Mutation(() => Boolean)
  async updateCart(
    @Ctx() { prisma, user }: GraphQLContext,
    @Arg("cartId") cartId: string,
    @Arg("cartItems", () => [CustomCartItemInput])
    cartItems: CustomCartItemInput[]
  ): Promise<boolean> {
    try {
      if (!user || !user?.id) {
        throw new GraphQLError("User not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }

      const cart = await prisma.cart.findUnique({ where: { id: cartId } });

      if (!cart || cart?.userId !== user?.id) {
        throw new GraphQLError("Cart not found or not authorized", {
          extensions: {
            code: "FORBIDDEN",
            http: {
              status: 403,
            },
          },
        });
      }

      await prisma.cart.update({
        where: { id: cartId },
        data: {
          cartItems: {
            deleteMany: {},
            create: cartItems?.map(({ itemId, quantity = 1 }) => ({
              menuItem: { connect: { id: itemId } },
              quantity,
            })),
          },
        },
      });

      return true;
    } catch (error: any) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          http: error.extensions?.http || {
            status: 500,
          },
          originalError: error,
        },
      });
    }
  }

  @Mutation(() => Boolean)
  async deleteCart(
    @Ctx() { prisma, user }: GraphQLContext,
    @Arg("cartId") cartId: string
  ): Promise<boolean> {
    try {
      if (!user || !user?.id) {
        throw new GraphQLError("User not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
            http: {
              status: 401,
            },
          },
        });
      }

      const cart = await prisma.cart.findUnique({ where: { id: cartId } });

      if (!cart || cart?.userId !== user?.id) {
        throw new GraphQLError("Cart not found or not authorized", {
          extensions: {
            code: "FORBIDDEN",
            http: {
              status: 403,
            },
          },
        });
      }

      await prisma.cartItem.deleteMany({ where: { cartId } });
      await prisma.cart.delete({ where: { id: cartId } });

      return true;
    } catch (error: any) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          http: error.extensions?.http || {
            status: 500,
          },
          originalError: error,
        },
      });
    }
  }
}
